package br.com.saferide.prototype;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DuplicateKeyException;
@RestControllerAdvice(basePackages="br.com.saferide.prototype")
public class ApiErrors {
 @ExceptionHandler(ResponseStatusException.class)
 ResponseEntity<?> status(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Solicitação inválida":e.getReason()));}
 @ExceptionHandler(MethodArgumentNotValidException.class)
 ResponseEntity<?> invalid(){return ResponseEntity.badRequest().body(Map.of("message","Confira os campos e os limites de tamanho."));}
 @ExceptionHandler(DuplicateKeyException.class)
 ResponseEntity<?> duplicate(){return ResponseEntity.status(409).body(Map.of("message","Esse cadastro já existe."));}
}
