package sovs.cocode

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import org.cef.CefApp
import javax.swing.JComponent

class CoCodeWindow (val project: Project) {
    fun content(): JComponent = webView.component

    private val webView: JBCefBrowser by lazy {
        val browser = JBCefBrowser()
        registerAppSchemeHandler()
        browser.loadURL("http://cocode/index.html")
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
}