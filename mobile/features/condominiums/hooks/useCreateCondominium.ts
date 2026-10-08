import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import {
  FormErrors,
  MAX_BLOCKS,
  NewBlock,
  SelectedPhoto,
  hasNoErrors,
  isFormErrors,
  normalizeBlockCode,
  parseUnitCount,
  totalUnits,
  validateNewCondominium,
} from "@/features/condominiums/domain/newCondominium";
import { createCondominium } from "@/features/condominiums/services/condominiumService";
import {
  PhotoSource,
  pickPhoto as pickPhotoOnDevice,
} from "@/features/condominiums/services/photoPicker";

/**
 * Estado do formulário de criação de um condomínio.
 *
 * Concentra estado, validação e o envio; não devolve JSX e não importa componente visual
 * (constituição, Princípio I).
 *
 * **O que este hook de propósito NÃO decide:** quem vira síndico. É quem está autenticado — o
 * formulário não manda, e o servidor não leria se mandasse.
 */

export const MESSAGE_OFFLINE =
  "Condominium not created. Check your connection and try again.";
export const MESSAGE_SERVER_ERROR =
  "Condominium not created. Something went wrong on the server.";
export const MESSAGE_PHOTO_DENIED =
  "Allow access to the camera or photos to add a picture.";

const EMPTY_BLOCK: NewBlock = { code: "", unitCount: "" };

export interface UseCreateCondominiumResult {
  name: string;
  setName: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  blocks: NewBlock[];
  /** Não acrescenta além do teto de blocos. */
  addBlock: () => void;
  /** Nunca deixa o formulário sem bloco nenhum: um condomínio tem ao menos um. */
  removeBlock: (index: number) => void;
  /** A sigla entra já normalizada: maiúsculas, só letras, no máximo duas. */
  setBlockCode: (index: number, typed: string) => void;
  setBlockUnitCount: (index: number, typed: string) => void;
  canAddBlock: boolean;
  /** O total de unidades, somando os blocos cujo número já é válido. */
  total: number;
  photo: SelectedPhoto | null;
  pickPhoto: (source: PhotoSource) => void;
  removePhoto: () => void;
  errors: FormErrors;
  submitting: boolean;
  /** Falha que não é de um field (rede ou servidor). */
  submitError: string | null;
  submit: () => void;
  /**
   * A pessoa já pertence a um condomínio, então não cria outro: só cria quem não pertence a nenhum,
   * e um síndico tem um só. A tela a manda de volta para a home em vez de mostrar um formulário
   * que o servidor recusaria.
   *
   * Cortesia de interface. Quem recusa de verdade é a API, com `409`.
   */
  alreadyBelongs: boolean;
}

/** A explicação que veio no corpo de um `409`, ou a frase geral quando não veio nenhuma. */
function conflictMessageOf(body: unknown): string {
  return typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : MESSAGE_SERVER_ERROR;
}

/** Tira do objeto as chaves indicadas — a mensagem de um campo sai quando a pessoa mexe nele. */
function without(errors: FormErrors, ...keys: string[]): FormErrors {
  const rest = { ...errors };
  for (const key of keys) {
    delete rest[key];
  }
  return rest;
}

/** Os errors de field de um `400`, quando o body veio no formato do contrato. */
function fieldErrorsFrom(error: unknown): FormErrors | null {
  if (!(error instanceof HttpError) || error.type !== "validation") {
    return null;
  }
  const body = error.body;
  if (typeof body !== "object" || body === null || !("errors" in body)) {
    return null;
  }
  const errors = (body as { errors: unknown }).errors;
  return isFormErrors(errors) ? errors : null;
}

export function useCreateCondominium(): UseCreateCondominiumResult {
  const router = useRouter();
  const { adoptCondominium, profile } = useAuth();
  const alreadyBelongs =
    profile.status === "ready" && profile.profile.memberships.length > 0;
  const [name, setNameValue] = useState("");
  const [address, setAddressValue] = useState("");
  const [blocks, setBlocks] = useState<NewBlock[]>([EMPTY_BLOCK]);
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setName = useCallback((value: string) => {
    setNameValue(value);
    setErrors((current) => without(current, "name"));
  }, []);

  const setAddress = useCallback((value: string) => {
    setAddressValue(value);
    setErrors((current) => without(current, "address"));
  }, []);

  const addBlock = useCallback(() => {
    setBlocks((current) =>
      current.length >= MAX_BLOCKS ? current : [...current, EMPTY_BLOCK]
    );
    setErrors((current) => without(current, "blocks"));
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks((current) =>
      current.length <= 1
        ? current
        : current.filter((_, position) => position !== index)
    );
    // As mensagens dos blocos são endereçadas pela POSIÇÃO, e remover um muda a posição dos que
    // vêm depois: em vez de reendereçar, todas saem e a próxima confirmação as recalcula.
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith("blocks"))
      )
    );
  }, []);

  const setBlockCode = useCallback((index: number, typed: string) => {
    setBlocks((current) =>
      current.map((block, position) =>
        position === index
          ? { ...block, code: normalizeBlockCode(typed) }
          : block
      )
    );
    // Mexer numa sigla pode desfazer uma repetição em QUALQUER bloco, então saem as mensagens de
    // sigla de todos.
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.endsWith(".code"))
      )
    );
  }, []);

  const setBlockUnitCount = useCallback((index: number, typed: string) => {
    setBlocks((current) =>
      current.map((block, position) =>
        // Só dígitos: o teclado numérico de alguns aparelhos deixa passar ponto e vírgula.
        position === index
          ? { ...block, unitCount: typed.replace(/[^0-9]/g, "").slice(0, 4) }
          : block
      )
    );
    setErrors((current) =>
      without(current, `blocks.${index}.unitCount`, "blocks")
    );
  }, []);

  const pickPhoto = useCallback((source: PhotoSource) => {
    if (submittingRef.current) {
      return;
    }
    void pickPhotoOnDevice(source).then((result) => {
      if (!mounted.current) {
        return;
      }
      // Fechar o seletor sem escolher não é erro: fica o que já estava.
      if (result.outcome === "cancelled") {
        return;
      }
      if (result.outcome === "denied") {
        // A foto é opcional: a mensagem explica, e o condomínio continua podendo ser criado.
        setErrors((current) => ({ ...current, photo: MESSAGE_PHOTO_DENIED }));
        return;
      }
      setPhoto(result.photo);
      setErrors((current) => without(current, "photo"));
    });
  }, []);

  const removePhoto = useCallback(() => {
    setPhoto(null);
    setErrors((current) => without(current, "photo"));
  }, []);

  /**
   * Valida, envia e — dando certo — entra no condomínio novo.
   *
   * Uma falha deixa o formulário aberto com tudo o que estava nele, foto incluída (FR-023). O ref
   * barra o segundo toque antes mesmo de o state re-renderizar: dois pedidos iguais criariam dois
   * condomínios, porque o servidor não tem como saber que são o mesmo (FR-022).
   */
  const submit = useCallback(() => {
    if (submittingRef.current) {
      return;
    }

    const validation = validateNewCondominium({ name, address, blocks, photo });
    if (!hasNoErrors(validation)) {
      setErrors(validation);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setErrors({});

    createCondominium({
      name: name.trim(),
      address: address.trim(),
      blocks: blocks.map((block) => ({
        code: block.code.trim().toUpperCase(),
        // Já validado acima: aqui é sempre um inteiro.
        unitCount: parseUnitCount(block.unitCount) ?? 0,
      })),
      ...(photo !== null ? { photo: photo.base64 } : {}),
    })
      .then(async (membership) => {
        // Recarrega o perfil — de onde vêm os vínculos — já com o condomínio novo escolhido, e
        // SUBSTITUI esta tela pela home: voltar não deve cair num formulário de um condomínio que
        // já existe.
        await adoptCondominium(membership.condominium.id);
        if (mounted.current) {
          router.replace("/");
        }
      })
      .catch((error: unknown) => {
        if (!mounted.current) {
          return;
        }
        const serverErrors = fieldErrorsFrom(error);
        if (serverErrors) {
          setErrors(serverErrors);
        } else if (error instanceof HttpError && error.type === "session") {
          // Quem reage é o AuthProvider, levando à tela de entrada: nada a mostrar aqui.
        } else if (error instanceof HttpError && error.type === "network") {
          setSubmitError(MESSAGE_OFFLINE);
        } else if (error instanceof HttpError && error.type === "conflict") {
          // `409`: a conta já pertence a um condomínio. O servidor explica, e é a explicação dele
          // que aparece — "algo deu errado" esconderia a única informação útil.
          setSubmitError(conflictMessageOf(error.body));
        } else {
          setSubmitError(MESSAGE_SERVER_ERROR);
        }
      })
      .finally(() => {
        submittingRef.current = false;
        if (mounted.current) {
          setSubmitting(false);
        }
      });
  }, [name, address, blocks, photo, adoptCondominium, router]);

  return {
    name,
    setName,
    address,
    setAddress,
    blocks,
    addBlock,
    removeBlock,
    setBlockCode,
    setBlockUnitCount,
    canAddBlock: blocks.length < MAX_BLOCKS,
    total: totalUnits(blocks),
    photo,
    pickPhoto,
    removePhoto,
    errors,
    submitting,
    submitError,
    submit,
    alreadyBelongs,
  };
}
