import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/shared/constants/Colors";
import {
  INICIAIS_DIAS_SEMANA,
  MesCalendario,
  dataISODeHoje,
  deslocarMes,
  mesInicialDoCalendario,
  montarDataISO,
  montarGradeDoMes,
  paraDataExibicao,
  rotuloDoMes,
  somarDias,
} from "@/shared/lib/calendario";

export interface DateFieldProps {
  label: string;
  /** Data selecionada em `YYYY-MM-DD`, ou string vazia quando ainda não há escolha. */
  valor: string;
  onChange: (dataISO: string) => void;
  erro?: string;
}

export const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    color: Colors.textMuted,
    marginBottom: 8,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  triggerOpen: {
    borderColor: Colors.accent,
  },
  triggerValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  triggerPlaceholder: {
    color: Colors.textSecondary,
  },
  shortcuts: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  shortcut: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.chipBackground,
  },
  shortcutSelected: {
    backgroundColor: Colors.accent,
  },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  calendar: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: Colors.chipBackground,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  week: {
    flexDirection: "row",
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  dayCell: {
    flex: 1,
    // Altura fixa: com `aspectRatio` a grade fica alta demais e empurra os botões da folha.
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTouchable: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  dayToday: {
    backgroundColor: Colors.accentSoft,
  },
  daySelected: {
    backgroundColor: Colors.accent,
  },
  dayLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dayLabelSelected: {
    fontWeight: "700",
    color: Colors.textOnAccent,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.danger,
  },
});

/**
 * Campo de data com calendário embutido (FR-005).
 *
 * Substitui a digitação livre `DD/MM/AAAA`: o usuário toca no campo, escolhe o dia
 * e nunca precisa do teclado — o que também evita o teclado cobrindo o formulário.
 * Nenhum cálculo de data vive aqui; tudo vem de `shared/lib/calendario`.
 */
export default function DateField({
  label,
  valor,
  onChange,
  erro,
}: DateFieldProps) {
  const [aberto, setAberto] = useState(false);
  const [mesVisivel, setMesVisivel] = useState<MesCalendario>(() =>
    mesInicialDoCalendario(valor)
  );

  const hoje = dataISODeHoje();
  const amanha = somarDias(hoje, 1);
  const semanas = montarGradeDoMes(mesVisivel);

  function alternarCalendario() {
    // O calendário e o teclado disputam o mesmo espaço na tela.
    Keyboard.dismiss();
    if (!aberto) {
      setMesVisivel(mesInicialDoCalendario(valor));
    }
    setAberto(!aberto);
  }

  function selecionar(dataISO: string) {
    onChange(dataISO);
    setAberto(false);
  }

  function escolherAtalho(dataISO: string) {
    Keyboard.dismiss();
    selecionar(dataISO);
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.trigger, aberto ? styles.triggerOpen : null]}
        onPress={alternarCalendario}
        accessibilityRole="button"
        accessibilityLabel={
          valor ? `Expected date ${paraDataExibicao(valor)}` : "Select a date"
        }
        accessibilityState={{ expanded: aberto }}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={Colors.textPrimary}
        />
        <Text
          style={[
            styles.triggerValue,
            valor ? null : styles.triggerPlaceholder,
          ]}
        >
          {valor ? paraDataExibicao(valor) : "Select a date"}
        </Text>
        <Ionicons
          name={aberto ? "chevron-up" : "chevron-down"}
          size={18}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      <View style={styles.shortcuts}>
        {[
          { rotulo: "Today", data: hoje },
          { rotulo: "Tomorrow", data: amanha },
        ].map((atalho) => (
          <TouchableOpacity
            key={atalho.rotulo}
            style={[
              styles.shortcut,
              valor === atalho.data ? styles.shortcutSelected : null,
            ]}
            onPress={() => escolherAtalho(atalho.data)}
            accessibilityRole="button"
            accessibilityState={{ selected: valor === atalho.data }}
          >
            <Text style={styles.shortcutLabel}>{atalho.rotulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {aberto ? (
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => setMesVisivel(deslocarMes(mesVisivel, -1))}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{rotuloDoMes(mesVisivel)}</Text>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => setMesVisivel(deslocarMes(mesVisivel, 1))}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.week}>
            {INICIAIS_DIAS_SEMANA.map((inicial, indice) => (
              <View key={indice} style={styles.weekdayCell}>
                <Text style={styles.weekdayLabel}>{inicial}</Text>
              </View>
            ))}
          </View>

          {semanas.map((semana, indiceSemana) => (
            <View key={indiceSemana} style={styles.week}>
              {semana.map((dia, indiceDia) => {
                if (dia === null) {
                  return (
                    <View
                      key={`${indiceSemana}-${indiceDia}`}
                      style={styles.dayCell}
                    />
                  );
                }

                const dataDoDia = montarDataISO(
                  mesVisivel.ano,
                  mesVisivel.mes,
                  dia
                );
                const selecionado = dataDoDia === valor;
                const ehHoje = dataDoDia === hoje;

                return (
                  <View
                    key={`${indiceSemana}-${indiceDia}`}
                    style={styles.dayCell}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dayTouchable,
                        ehHoje && !selecionado ? styles.dayToday : null,
                        selecionado ? styles.daySelected : null,
                      ]}
                      onPress={() => selecionar(dataDoDia)}
                      accessibilityRole="button"
                      accessibilityLabel={paraDataExibicao(dataDoDia)}
                      accessibilityState={{ selected: selecionado }}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          selecionado ? styles.dayLabelSelected : null,
                        ]}
                      >
                        {dia}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}

      {erro ? <Text style={styles.error}>{erro}</Text> : null}
    </View>
  );
}
