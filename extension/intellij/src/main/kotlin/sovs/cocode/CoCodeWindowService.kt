package sovs.cocode

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project

@Service(Service.Level.PROJECT)
class CoCodeWindowService (val project: Project) {
    val codeWindow: CoCodeWindow = CoCodeWindow(project)
}