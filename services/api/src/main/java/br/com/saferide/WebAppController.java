package br.com.saferide;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@ConditionalOnProperty(name = "spring.web.resources.static-locations")
public class WebAppController {
    @GetMapping(value = {"/history", "/news", "/settings", "/community", "/profile", "/simulation"},
                produces = "text/html")
    public String openApp() {
        return "forward:/index.html";
    }
}
