package br.com.saferide.prototype;
import java.util.*;
import java.time.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
@Service @Profile("prototype")
public class AuthService {
 private final JdbcTemplate db;
 private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(12);
 private final SecureRandom random=new SecureRandom();
 public AuthService(JdbcTemplate db){this.db=db;}
 public record User(String id,String email,String name,String activity,String vehicle,List<String> platforms,String role){}
 public record Login(String token,User user){}
 public User user(String id){return db.queryForObject("SELECT * FROM sr_account WHERE id=?",(r,n)->new User(r.getString("id"),r.getString("email"),r.getString("name"),r.getString("activity"),r.getString("vehicle"),List.of(r.getString("platforms").split(",")),r.getString("role")),id);}
 public static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 public User require(String header){
  if(header==null||!header.startsWith("Bearer ")||header.length()>200)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Entre na sua conta para continuar.");
  var ids=db.queryForList("SELECT account_id FROM sr_session WHERE token_hash=? AND expires_at>?",String.class,hash(header.substring(7)),Timestamp.from(Instant.now()));
  if(ids.isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sessão expirada. Entre novamente.");
  return user(ids.getFirst());
 }
 public User moderator(String header){var u=require(header);if(!u.role().equals("MODERATOR"))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Acesso restrito à moderação.");return u;}
 @Transactional public Login register(String email,String password,String name){
  if(password.getBytes(StandardCharsets.UTF_8).length>72)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Senha deve ter até 72 bytes.");
  String id=UUID.randomUUID().toString();
  db.update("INSERT INTO sr_account(id,email,password_hash,name,activity,vehicle,platforms,role,created_at) VALUES(?,?,?,?,?,?,?,'MEMBER',?)",id,email.trim().toLowerCase(Locale.ROOT),encoder.encode(password),name.trim(),"Transporte e entregas","Moto","independente",Timestamp.from(Instant.now()));
  return session(id);
 }
 public Login login(String email,String password){
  var rows=db.queryForList("SELECT id,password_hash FROM sr_account WHERE email=?",email.trim().toLowerCase(Locale.ROOT));
  if(rows.isEmpty()||password.getBytes(StandardCharsets.UTF_8).length>72||!encoder.matches(password,(String)rows.getFirst().get("password_hash")))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"E-mail ou senha incorretos.");
  return session((String)rows.getFirst().get("id"));
 }
 private Login session(String id){byte[] bytes=new byte[32];random.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  db.update("DELETE FROM sr_session WHERE expires_at<?",Timestamp.from(Instant.now()));
  db.update("INSERT INTO sr_session VALUES(?,?,?)",hash(token),id,Timestamp.from(Instant.now().plus(Duration.ofHours(24))));return new Login(token,user(id));}
 public void logout(String header){require(header);db.update("DELETE FROM sr_session WHERE token_hash=?",hash(header.substring(7)));}
}
