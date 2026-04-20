package sovs.cocode

import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.ui.ColorUtil
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil

object ThemeBridge {
fun getThemeAsJsVariables(): String {
    // Map IntelliJ colors to VS Code variable names
    val colors = mapOf(
            "--vscode-font-family" to "${JBUI.Fonts.label().family}, sans-serif",
            "--vscode-editor-font-family" to "${EditorColorsManager.getInstance().globalScheme.editorFontName}, monospace",
            "--vscode-editor-font-size" to "${EditorColorsManager.getInstance().globalScheme.editorFontSize}px",
            "--vscode-foreground" to ColorUtil.toHtmlColor(UIUtil.getLabelForeground()),
            "--vscode-descriptionForeground" to ColorUtil.toHtmlColor(UIUtil.getContextHelpForeground()),
            "--vscode-button-background" to ColorUtil.toHtmlColor(JBUI.CurrentTheme.Button.buttonColorStart()),
            "--vscode-button-foreground" to ColorUtil.toHtmlColor(JBUI.CurrentTheme.Button.defaultButtonForeground()),
            "--vscode-button-hoverBackground" to ColorUtil.toHtmlColor(JBUI.CurrentTheme.Button.focusBorderColor(true)),
            "--vscode-sideBar-background" to ColorUtil.toHtmlColor(UIUtil.getPanelBackground()),
            "--vscode-widget-border" to ColorUtil.toHtmlColor(JBUI.CurrentTheme.CustomFrameDecorations.separatorForeground()),
            "--vscode-focusBorder" to ColorUtil.toHtmlColor(JBUI.CurrentTheme.Focus.focusColor()),
            "--vscode-list-hoverBackground" to ColorUtil.toHtmlColor(UIUtil.getListSelectionBackground(false)),
            "--vscode-errorForeground" to ColorUtil.toHtmlColor(JBUI.CurrentTheme.Banner.ERROR_BACKGROUND)
    )



    val jsCode = colors.entries.joinToString(" ") { (key, value) ->
            "document.documentElement.style.setProperty('$key', '$value');"
    }

    return jsCode
}

// Helper to determine which Highlight.js theme to use
fun getHighlightJsTheme(): String {
    return if (true) "atom-one-dark" else "atom-one"
}
}