package sovs.cocode

import org.cef.callback.CefCallback
import org.cef.handler.CefLoadHandler
import org.cef.handler.CefResourceHandler
import org.cef.misc.IntRef
import org.cef.misc.StringRef
import org.cef.network.CefRequest
import org.cef.network.CefResponse
import java.io.IOException
import java.io.InputStream
import java.net.URLConnection

class CoCodeSchemeHandler : CefResourceHandler {
    private var state: ResourceHandlerState = ClosedConnection
    override fun processRequest(
        cefRequest: CefRequest,
        cefCallback: CefCallback
    ): Boolean {
        val url = cefRequest.url ?: return false

        println(url)
        val pathToResource = url.replace("http://cocode", "webview/")
        val resourceUrl = javaClass.classLoader.getResource(pathToResource)

        if (resourceUrl != null) {
            state = OpenedConnection(resourceUrl.openConnection())
            cefCallback.Continue()
            return true
        } else {
            // Resource not found in the JAR
            state = ClosedConnection
            cefCallback.cancel()
            return false
        }
    }

    override fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    ) {
        state.getResponseHeaders(cefResponse, responseLength, redirectUrl)
    }

    override fun readResponse(
        dataOut: ByteArray,
        designedBytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean {
        return state.readResponse(dataOut, designedBytesToRead, bytesRead, callback)
    }

    override fun cancel() {
        state.close()
        state = ClosedConnection
    }
}

sealed interface ResourceHandlerState {
    fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    )

    fun readResponse(
        dataOut: ByteArray,
        designedBytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean

    fun close()
}

class OpenedConnection(private val connection: URLConnection) : ResourceHandlerState {
    private val inputStream: InputStream by lazy {
        connection.getInputStream()
    }

    override fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    ) {
        try {
            val url = connection.url.toString()
            when {
                url.contains("css")  -> cefResponse.mimeType = "text/css"
                url.contains("js") -> cefResponse.mimeType = "text/javascript"
                url.contains("html") -> cefResponse.mimeType = "text/html"
                else -> cefResponse.mimeType = connection.contentType
            }
            responseLength.set(inputStream.available())
            cefResponse.status = 200
        } catch (e: IOException) {
            cefResponse.error = CefLoadHandler.ErrorCode.ERR_FILE_NOT_FOUND
            cefResponse.statusText = e.message
            cefResponse.status = 404
        }
    }

    override fun readResponse(
        dataOut: ByteArray,
        designedBytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean  {
        val availableSize = inputStream.available()
        if (availableSize > 0) {
            val maxBytesToRead = availableSize.coerceAtMost(designedBytesToRead)
            val realNumberOfReadBytes =
                inputStream.read(dataOut, 0, maxBytesToRead)
            bytesRead.set(realNumberOfReadBytes)
            return true
        } else {
            inputStream.close()
            return false
        }
    }

    override fun close() {
        inputStream.close()
    }
}

object ClosedConnection : ResourceHandlerState {
    override fun getResponseHeaders(
        cefResponse: CefResponse,
        responseLength: IntRef,
        redirectUrl: StringRef
    ) {
        cefResponse.status = 404
    }

    override fun readResponse(
        dataOut: ByteArray,
        designedBytesToRead: Int,
        bytesRead: IntRef,
        callback: CefCallback
    ): Boolean {
        return false
    }

    override fun close() {}
}