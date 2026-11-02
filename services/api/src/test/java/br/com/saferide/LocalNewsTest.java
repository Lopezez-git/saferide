package br.com.saferide;
import br.com.saferide.prototype.LocalNewsController;
import br.com.saferide.prototype.NewsRelevance;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class LocalNewsTest {
 @Test void rejectsUnrelatedHeadlinesEvenWhenTheyMentionThePlace(){
  for(String title:new String[]{"Hino da Independência toca no último ato de Lula na avenida Paulista - G1","Show reúne fãs na Avenida Paulista","Obras de arte são expostas na Avenida Paulista","Restaurante inaugura na Rua Augusta","Candidato discursa sobre segurança na Avenida Paulista","Acidente vascular cerebral afasta artista de show na Paulista"})assertThat(NewsRelevance.relevant(title)).as(title).isFalse();
 }
 @Test void acceptsConcreteRoadAndSafetyImpactsIncludingEventClosures(){
  for(String title:new String[]{"Assalto na Avenida Paulista", "Interdição na Avenida Paulista para ato de Lula", "Alagamento bloqueia Rua Augusta", "Colisão entre motos na Avenida Paulista", "Buraco na Rua Augusta afeta motoristas", "Obras na Avenida Paulista alteram trânsito", "Semáforos apagados na Rua Augusta", "Árvore caída na Avenida Paulista"})assertThat(NewsRelevance.relevant(title)).as(title).isTrue();
 }
 @Test void relevanceDoesNotReplaceTheLocationFilter(){
  String title="Assalto na Rua Augusta";
  assertThat(NewsRelevance.relevant(title)&&LocalNewsController.mentions(title,"Avenida Paulista")).isFalse();
 }
 @Test void requiresSelectedPlaceInsteadOfGenericCity(){
  assertThat(LocalNewsController.mentions("Assalto em São Paulo", "Avenida Paulista")).isFalse();
  assertThat(LocalNewsController.mentions("Obra na Rua Augusta", "Avenida Paulista")).isFalse();
  assertThat(LocalNewsController.mentions("Interdição na Av. Paulista neste domingo", "Avenida Paulista")).isTrue();
  assertThat(LocalNewsController.mentions("Obras na Praça da Sé", "Praça da Sé")).isTrue();
  assertThat(LocalNewsController.mentions("Obras na Praça da Século", "Praça da Sé")).isFalse();
  assertThat(LocalNewsController.mentions("Chuva em São Paulo", "São Paulo")).isFalse();
 }
}
