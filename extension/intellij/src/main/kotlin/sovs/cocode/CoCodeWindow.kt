package sovs.cocode

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import org.cef.CefApp
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import javax.swing.JComponent

class CoCodeWindow (val project: Project) {
    fun content(): JComponent = webView.component

    private val cocode_base_url = "cocode.felixberg.dev"

    private val webView: JBCefBrowser by lazy {
        val browser = JBCefBrowser()
        // registerAppSchemeHandler()
        browser.loadHTML(getHtmlContent())

        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                if (frame?.isMain == true) {
                    // Inject the theme variables we generated in Step 1
                    browser?.executeJavaScript(ThemeBridge.getThemeAsJsVariables(), frame.url, 0)
                }
            }
        }, browser.cefBrowser)

        Disposer.register(project, browser)
        browser
    }

    private fun registerAppSchemeHandler() {
        CefApp.getInstance()
            .registerSchemeHandlerFactory(
                "http",
                "cocode",
                CoCodeSchemeHandlerFactory()
            )

    }

    fun getHtmlContent(): String {
        val resource = javaClass.classLoader.getResource("webview/index.html")

        var html = resource.readText()
        // Replace your custom template markers
        html = html.replace("{{CODE_COMPLETION_STYLESHEET_MAGICAL_STRING}}", ThemeBridge.getHighlightJsTheme())
        html = html.replace("{{COCODE_BASE_URL}}", "https://${cocode_base_url}")
        html = html.replace("{{COCODE_BASE_SHORT_URL}}", cocode_base_url)

        // TODO: Actually implement tracking old sessions
        html = html.replace("{{SESSION_ID}}", "null");
        html = html.replace("{{SESSION_CODE}}", "null");

        // For Codicons, you might want to bundle the font or use a CDN
        html = html.replace("{{CODEICONS_URI_MAGICAL_STRING}}", "https://cdnjs.cloudflare.com/ajax/libs/vscode-codicons/0.0.32/codicon.min.css")

        return html
    }
}