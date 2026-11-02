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
  if(has(text,"assaltos?|assaltad[oa]s?|roubos?|furtos?|arrastoes|arrastao|tiroteios?|balead[oa]s?|sequestros?|incendios?"))return "Segurança";
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
}
