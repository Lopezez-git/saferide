package br.com.saferide;
import br.com.saferide.prototype.LocalNewsController;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class LocalNewsTest {
 @Test void requiresSelectedPlaceInsteadOfGenericCity(){
  assertThat(LocalNewsController.mentions("Assalto em São Paulo", "Avenida Paulista")).isFalse();
  assertThat(LocalNewsController.mentions("Obra na Rua Augusta", "Avenida Paulista")).isFalse();
  assertThat(LocalNewsController.mentions("Interdição na Av. Paulista neste domingo", "Avenida Paulista")).isTrue();
  assertThat(LocalNewsController.mentions("Obras na Praça da Sé", "Praça da Sé")).isTrue();
  assertThat(LocalNewsController.mentions("Obras na Praça da Século", "Praça da Sé")).isFalse();
  assertThat(LocalNewsController.mentions("Chuva em São Paulo", "São Paulo")).isFalse();
 }
}
