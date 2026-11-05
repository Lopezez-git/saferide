package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.core.io.ClassPathResource;
import java.nio.file.*;
import java.util.concurrent.TimeUnit;
import org.slf4j.LoggerFactory;

/** A single background refresh; requests keep serving the last validated snapshot. */
@Component @Profile("prototype")
public class PublicDataRefresh {
 static Path root() {
  Path path=Path.of(System.getProperty("user.dir")).toAbsolutePath();
  while(path!=null) {
   if(Files.exists(path.resolve("scripts/refresh_public_data.py")))return path;
   path=path.getParent();
  }
  return Path.of(System.getProperty("user.dir")).toAbsolutePath();
 }
 static Path directory() {
  String configured=System.getenv("SAFERIDE_PUBLIC_DATA_DIR");
  return configured==null?root().resolve("data/private/public-data"):Path.of(configured).toAbsolutePath();
 }
 @Scheduled(initialDelay=10000, fixedDelayString="${saferide.public-data.refresh-ms:21600000}")
 public void refresh() {
  if("false".equalsIgnoreCase(System.getenv("SAFERIDE_PUBLIC_DATA_REFRESH_ENABLED")))return;
  var log=LoggerFactory.getLogger(PublicDataRefresh.class);
  Process process=null;
  try {
   Files.createDirectories(directory());
   String python=System.getenv().getOrDefault("SAFERIDE_PYTHON", "python");
   process=new ProcessBuilder(python,root().resolve("scripts/refresh_public_data.py").toString(),
     "--output-dir",directory().toString()).redirectErrorStream(true)
     .redirectOutput(directory().resolve("refresh.log").toFile()).start();
   if(!process.waitFor(30,TimeUnit.MINUTES)){process.destroyForcibly();throw new IllegalStateException("Tempo limite da importacao excedido");}
   if(process.exitValue()!=0)log.warn("Atualizacao publica incompleta; ultima base preservada. Consulte {}",directory().resolve("refresh.log"));
  } catch(Exception error) {
   if(process!=null&&process.isAlive())process.destroyForcibly();
   if(error instanceof InterruptedException)Thread.currentThread().interrupt();
   log.warn("Falha ao atualizar bases publicas; ultima base preservada",error);
  }
 }
 public static class Snapshot {
  private final ObjectMapper mapper;
  private final String name;
  private JsonNode data;
  private long stamp=-1;
  private final Path path;
  public Snapshot(ObjectMapper mapper,String name) {
   this(mapper,name,directory().resolve(name));
  }
  Snapshot(ObjectMapper mapper,String name,Path path) {
   this.mapper=mapper;this.name=name;this.path=path;
   try(var input=new ClassPathResource("data/"+name).getInputStream()){data=mapper.readTree(input);}
   catch(Exception ignored) { }
  }
  public synchronized JsonNode get() {
   try {
    long modified=Files.getLastModifiedTime(path).toMillis();
    if(modified!=stamp) {
     JsonNode next=mapper.readTree(path.toFile());
     String rows=name.startsWith("ssp")?"cells":"records";
     if(!next.path(rows).isArray()||next.path(rows).isEmpty()||next.path("periodEnd").asText().isBlank())
      throw new IllegalStateException("Base invalida");
     data=next;stamp=modified;
    }
   } catch(Exception ignored) { /* Last valid data survives unavailable or invalid downloads. */ }
   return data;
  }
 }
}
