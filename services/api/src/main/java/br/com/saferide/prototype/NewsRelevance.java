package br.com.saferide.prototype;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Conservative headline rules: a location mention alone is not a road alert. */
public final class NewsRelevance {
 private NewsRelevance() {}
 private static boolean has(String text,String expression) {
  return Pattern.compile("\\b(?:"+expression+")\\b").matcher(text).find();
 }
 public static String topic(String headline) {
  String text=Normalizer.normalize(headline,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);
  if(has(text,"alagament[oa]s?|enchentes?|inundac(?:ao|oes)|enxurradas?|deslizamentos?|queda de arvores?|arvores? ca[ií]das?|chuvas? (?:fortes?|intensas?)"))return "Clima e via";
  if(has(text,"assaltos?|assaltad[oa]s?|roubos?|roubad[oa]s?|furtos?|furtad[oa]s?|arrastoes|arrastao|tiroteios?|balead[oa]s?|sequestros?|incendios?"))return "Segurança";
  if(has(text,"atropelamentos?|atropelad[oa]s?|colis(?:ao|oes)|capotamentos?|engavetamentos?|acidentes? (?:de transito|com|entre|na|no|em)|(?:carro|moto|onibus|caminhao) (?:bate|tomba|capota)"))return "Acidentes";
  if(has(text,"buracos?|crateras?|asfalto|pavimento|recapeamento|pavimentac(?:ao|oes)"))return "Pavimento";
  if(has(text,"interdic(?:ao|oes)|interditad[oa]s?|congestionamentos?|transito (?:lento|parado|intenso)|bloqueios? (?:de|na|em)|(?:via|avenida|rua|pista|faixa|ponte|tunel) (?:fechad[oa]|bloquead[oa])s?|desvios? (?:de transito|na via)|semaforos? (?:quebrad[oa]s?|apagados?|sem funcionar)"))return "Trânsito";
  if(has(text,"obras?|manutencao")&&has(text,"transito|via|rua|avenida|rodovia|pista|ponte|tunel|calcada|viaduto")&&!has(text,"obras? de arte|exposicao|museu"))return "Obras na via";
  return null;
 }
 public static boolean relevant(String title) {
  String headline=title.contains(" - ")?title.substring(0,title.lastIndexOf(" - ")):title;
  return topic(headline)!=null;
 }

 public static String headline(String title) {
  int suffix=title.lastIndexOf(" - ");
  return suffix<0 ? title : title.substring(0,suffix);
 }

 public static String feedCategory(String title) {
  String t=Normalizer.normalize(headline(title),Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);
  if(has(t,"projeto de lei|campanha eleitoral|projeto de resolucao|proposta de lei"))return null;
  boolean road=has(t,"ruas?|avenidas?|rodovias?|estradas?|marginal|ponte|tunel|viaduto|pistas?|faixa|vias?|cruzamento|trafego|transito|acesso|minhocao");
  boolean impact=has(t,"interdita(?:m|da|do|das|dos)?|interdicao|interdicoes|bloqueia(?:m)?|bloquead[oa]s?|bloqueios?|fechad[oa]s?|liberad[oa]s?|reabert[oa]s?|reabre|libera|desvios?|congestionamento|lentidao");

  String topic=topic(t);
  if(("Pavimento".equals(topic) && road) || has(t,"recape(?:amento)?|tapa[ -]buracos?|pavimentacao|crateras?|fresagem|recapead[oa]s?|asfaltamento|camada de asfalto|asfalto novo|reparos? (?:no|do) pavimento|cascalhamento"))return "Pavimento";
  if(road && impact)return "Trânsito e acesso";
  if("Segurança".equals(topic) && (road || has(t,"motoristas?|motociclistas?|entregador(?:es)?|veiculos?|carros?|motos?|caminhao|caminhoes|caminhoneir[oa]s?|porta-malas|motocicletas?|cargas?|arrastao|arrastoes")))return "Segurança";
  if("Clima e via".equals(topic) && (road || has(t,"alagamentos?|enchentes?|inundacoes|deslizamentos?|enxurradas?")))return "Trânsito e acesso";
  if("Acidentes".equals(topic) || "Trânsito".equals(topic) || "Obras na via".equals(topic))return "Trânsito e acesso";
  return null;
 }

 public static boolean inPilotRegion(String title) {
  String t=Normalizer.normalize(headline(title),Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);
  if(has(t,"(?:interior|litoral|estado) (?:paulista|de sao paulo|de sp)|baixada santista|maua da serra"))return false;
  if(has(t,"sao paulo|capital paulista|grande sp|grande abc|diadema|guarulhos|mogi das cruzes|suzano|itaquaquecetuba|osasco|barueri|carapicuiba|embu das artes|taboao da serra|itapevi|santana de parnaiba|sao bernardo do campo|santo andre|ribeirao pires|maua|sao caetano do sul|minhocao|marginal (?:tiete|pinheiros)|avenida paulista"))return true;
  return has(t,"sp") && has(t,"zona (?:sul|norte|leste|oeste)|bras|barra funda|campo limpo|capao redondo|itaquera|mooca");
 }

 static String regionalCategory(String title,String source,String description){
  String lead=description==null?"":description;
  String text=headline(title)+" "+lead;
  boolean localOutlet=switch(source){
   case "Frankamente ABC","Prefeitura de Diadema","ABCD Jornal","Visão Oeste","TV São Bernardo","Notícias de Mogi","Rede Cidade Live","Hoje Diário","Repórter Diário","Agência SP","G1","R7" -> true;
   default -> false;
  };
  boolean regional=inPilotRegion(title) || "Prefeitura de Diadema".equals(source);
  if(localOutlet){
   regional|=inPilotRegion(text) || has(text.toLowerCase(Locale.ROOT),"zona (?:sul|norte|leste|oeste) da capital paulista");
  }
  if(source.equals("TV São Bernardo") || source.equals("ABCD Jornal") || source.equals("Frankamente ABC") || source.equals("Repórter Diário")){
   regional|=has(text.toLowerCase(Locale.ROOT),"são bernardo|são caetano|sbc|rodoanel");
  }
  if("Agência SP".equals(source) && has(title.toLowerCase(Locale.ROOT),"zona (?:sul|norte|leste|oeste) da capital"))regional=true;
  if(!regional)return null;
  String category=feedCategory(title);
  if(category!=null || !localOutlet)return category;
  if(has(text.toLowerCase(Locale.ROOT),"projeto de lei|campanha eleitoral"))return null;
  String contextual=feedCategory(text);
  if("Segurança".equals(contextual)){
   String evidence=lead.toLowerCase(Locale.ROOT);
   if(has(evidence,"antecedentes|passagem anterior|histórico criminal"))return null;
   // A generic mention of a vehicle (which could be stolen property) is insufficient.
   if(!has(evidence,"ruas?|avenidas?|rodovias?|estradas?|semáforos?|motoristas?|entregador(?:es)?|motociclistas?|carros?|motos?|motocicletas?|caminhões|cargas?|porta-malas|arrastão"))return null;
  }
  return "Pavimento".equals(contextual) || "Segurança".equals(contextual)?contextual:null;
 }
}
