package br.com.saferide.prototype;

import com.fasterxml.jackson.databind.JsonNode;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

public final class PlaceResults {
 private PlaceResults() {}
 private static String normalize(String value) {
  return Normalizer.normalize(value,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]"," ").replaceAll("\\s+"," ").strip();
 }
 private record Candidate(PlaceController.Place place,int score,boolean relevant) {}
 public static List<PlaceController.Place> parse(JsonNode root,String query) {
  var tokens=Arrays.stream(normalize(query).split(" ")).filter(t->!t.isBlank()&&!t.matches("[0-9]+")&&!Set.of("rua","r","av","avenida","praca","da","de","do","das","dos").contains(t)).toList();
  var numberMatcher=Pattern.compile("(?:^|[ ,])([0-9]+[a-z]?)$").matcher(normalize(query));
  String number=numberMatcher.find()&&!tokens.isEmpty()?numberMatcher.group(1):"";
  List<Candidate> candidates=new ArrayList<>();
  for(var f:root.path("features")) {
   var c=f.path("geometry").path("coordinates");var a=f.path("properties");
   if(c.size()<2||!c.get(0).isNumber()||!c.get(1).isNumber())continue;
   double lon=c.get(0).asDouble(),lat=c.get(1).asDouble();
   if(!Double.isFinite(lat)||!Double.isFinite(lon)||lat< -24.1||lat> -23.3||lon< -46.9||lon> -46.3)continue;
   String street=a.path("street").asText(""),house=a.path("housenumber").asText("");
   String name=a.path("name").asText(street.isBlank()?"Local encontrado":street);
   boolean streetQuery=normalize(query).matches("^(rua|r|avenida|av|praca) .*");
   String searchable=normalize(streetQuery ? (street.isBlank()?name:street) : name+" "+street);
   boolean relevant=!tokens.isEmpty()&&tokens.stream().allMatch(t->Arrays.stream(searchable.split(" ")).anyMatch(w->w.startsWith(t)));
   boolean exactNumber=!number.isEmpty()&&normalize(house).equals(number);
   Set<String> address=new LinkedHashSet<>();
   for(String field:List.of("street","housenumber","district","city","state")){String v=a.path(field).asText("");if(!v.isBlank())address.add(v);}
   String accuracy=!number.isEmpty()?(exactNumber&&relevant?"Número encontrado na base":"Resultado aproximado — confira o número"):house.isBlank()?(a.path("osm_key").asText().equals("highway")?"Trecho de via — escolha o ponto no mapa":"Local sem número informado"):"Endereço informado na base";
   String id=a.path("osm_type").asText()+a.path("osm_id").asText()+":"+lat+":"+lon;
   candidates.add(new Candidate(new PlaceController.Place(id,name,String.join(", ",address),lat,lon,accuracy,a.path("city").asText(""),street,a.path("district").asText("")), (relevant?100:0)+(exactNumber?20:0),relevant));
  }
  boolean hasRelevant=candidates.stream().anyMatch(Candidate::relevant);
  candidates.sort(Comparator.comparingInt(Candidate::score).reversed());
  List<PlaceController.Place> results=new ArrayList<>();
  for(var candidate:candidates){
   if(hasRelevant&&!candidate.relevant())continue;
   var p=candidate.place();
   boolean duplicate=results.stream().anyMatch(other->normalize(other.name()+other.address()).equals(normalize(p.name()+p.address()))&&Math.hypot((other.latitude()-p.latitude())*111000,(other.longitude()-p.longitude())*102000)<150);
   if(!duplicate)results.add(p);
  }
  return List.copyOf(results);
 }
}
