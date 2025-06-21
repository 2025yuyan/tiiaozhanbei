package api;
import io.vercel.functions.HttpRequest;
import io.vercel.functions.HttpResponse;
import io.vercel.functions.HttpRequestHandler;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class Handler implements HttpRequestHandler {

    @Override
    public void handle(HttpRequest request, HttpResponse response) throws IOException {
        // 全局CORS处理
        response.getHeaders().put("Access-Control-Allow-Origin", "*");
        response.getHeaders().put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.getHeaders().put("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatusCode(204);
            return;
        }

        response.setStatusCode(200);
        response.getHeaders().put("Content-Type", "application/json; charset=UTF-8");
        String json = "{\"message\":\"这是一个来自Vercel的最小化测试，用于确认部署配置是否正确。\"}";
        response.getBody().write(json.getBytes(StandardCharsets.UTF_8));
    }
}