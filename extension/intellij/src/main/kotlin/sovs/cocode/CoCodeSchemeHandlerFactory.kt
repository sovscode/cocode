package sovs.cocode

import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.callback.CefSchemeHandlerFactory
import org.cef.handler.CefResourceHandler
import org.cef.network.CefRequest

class CoCodeSchemeHandlerFactory : CefSchemeHandlerFactory {
    override fun create(
        p0: CefBrowser?,
        p1: CefFrame?,
        p2: String?,
        p3: CefRequest?
    ): CefResourceHandler {
        return CoCodeSchemeHandler()
    }
}