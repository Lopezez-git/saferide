package br.com.saferide.prototype;

import java.text.Normalizer;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;

/** A publication date is only an anchor for an explicitly dated operational notice. */
record NewsWindow(Instant start, Instant end) {
    private static final ZoneId CITY = ZoneId.of("America/Sao_Paulo");
    private static final Pattern DAY = Pattern.compile("\\b(hoje|amanha|\\d{1,2}/\\d{1,2}(?:/\\d{4})?)\\b");
    private static final Pattern HOURS = Pattern.compile("\\bdas\\s+(\\d{1,2})h(\\d{2})?\\s+as\\s+(\\d{1,2})h(\\d{2})?\\b");

    static Optional<NewsWindow> from(String headline, Instant published) {
        String text = Normalizer.normalize(NewsRelevance.headline(headline), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        var day = DAY.matcher(text);
        var hours = HOURS.matcher(text);
        if (!day.find() || !hours.find()) return Optional.empty();
        String reference = day.group();
        try {
            LocalDate date = published.atZone(CITY).toLocalDate();
            if (reference.equals("amanha")) date = date.plusDays(1);
            else if (!reference.equals("hoje")) {
                String[] parts = reference.split("/");
                date = LocalDate.of(parts.length == 3 ? Integer.parseInt(parts[2]) : date.getYear(),
                    Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
            }
            LocalTime start = time(hours.group(1), hours.group(2));
            LocalTime end = time(hours.group(3), hours.group(4));
            if (start.equals(end) || day.find() || hours.find()) return Optional.empty();
            return Optional.of(new NewsWindow(date.atTime(start).atZone(CITY).toInstant(),
                (end.isBefore(start) ? date.plusDays(1) : date).atTime(end).atZone(CITY).toInstant()));
        } catch (DateTimeException | NumberFormatException e) { return Optional.empty(); }
    }

    private static LocalTime time(String hour, String minute) {
        return LocalTime.of(Integer.parseInt(hour), minute == null ? 0 : Integer.parseInt(minute));
    }
}
