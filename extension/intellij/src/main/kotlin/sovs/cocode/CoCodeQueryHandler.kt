package sovs.cocode
import com.intellij.ui.jcef.JBCefJSQuery
import io.ktor.client.*
import io.ktor.client.call.body
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.headers
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.runBlocking

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class CoCodeQueryHandler {
    val client: HttpClient
    val baseUrl: String

    constructor(baseUrl: String) {
        this.baseUrl = baseUrl
        client = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }
    }
    @Serializable
    data class Request(val query: String, val content : String)

    fun handle(requestStr: String): JBCefJSQuery.Response? {
        println(requestStr)
        val request = Json.decodeFromString<Request>(requestStr)
        return runBlocking {
            when (request.query) {
                "StartSession" -> handleStartSession();
                else -> null
            }
        }
    }

    @Serializable
    data class Session(val id: String, val code : Int)
    private suspend fun handleStartSession() : JBCefJSQuery.Response? {
        println("Trying to start a session $baseUrl/api/sessions")

        try {
            val session_response = client.post("$baseUrl/api/sessions")
            println(session_response.bodyAsText())
            val session : Session = session_response.body()
            return JBCefJSQuery.Response(session_response.bodyAsText())
        }
        catch (e: Exception) {
            println("Exception while trying to start a session ${e.message}")
        }
        return null;
    }
}