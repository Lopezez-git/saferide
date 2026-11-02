package br.com.saferide;
import br.com.saferide.prototype.PlaceResults;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class PlaceResultsTest {
 private final ObjectMapper json=new ObjectMapper();
 private ObjectNode feature(String name,String street,String number,double lat){
  var f=json.createObjectNode();f.putObject("geometry").putArray("coordinates").add(-46.65).add(lat);
  var p=f.putObject("properties");p.put("name",name);p.put("street",street);p.put("housenumber",number);p.put("city","São Paulo");return f;
 }
 @Test void prioritizesStructuredNumberAndExcludesUnrelatedStreet(){
  var root=json.createObjectNode();root.putArray("features")
   .add(feature("Avenida Paulista, 1578","Avenida Paulista","1600",-23.56))
   .add(feature("MASP","Av. Paulista","1578",-23.561))
   .add(feature("Avenida Jandira","Avenida Jandira","1578",-23.57))
   .add(feature("Brooklin Paulista","Avenida Jornalista Roberto Marinho","1578",-23.58));
  var results=PlaceResults.parse(root,"Avenida Paulista 1578");
  assertThat(results).hasSize(2);assertThat(results.get(0).name()).isEqualTo("MASP");
  assertThat(results.get(0).accuracy()).isEqualTo("Número encontrado na base");
  assertThat(results.get(1).accuracy()).contains("aproximado");
 }
 @Test void preservesFullStreetAndDoesNotCollapseDistantPoints(){
  var root=json.createObjectNode();root.putArray("features")
   .add(feature("Rua Augusta","Rua Augusta","1500",-23.56))
   .add(feature("Rua Augusta","Rua Augusta","1500",-23.5601))
   .add(feature("Rua Augusta","Rua Augusta","1500",-23.58))
   .add(feature("Rua Augusta","Rua Augusta","1500",0));
  var results=PlaceResults.parse(root,"Rua Augusta 1500");
  assertThat(results).hasSize(2);assertThat(results.get(0).address()).contains("Rua Augusta, 1500");
 }
}
