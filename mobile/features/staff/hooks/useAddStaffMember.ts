import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import {
  StaffFormErrors,
  StaffRole,
  fieldErrorsOf,
  hasAdministrator,
  hasNoErrors,
  validateNewStaffMember,
} from "@/features/staff/domain/staff";
import { failureMessage } from "@/features/staff/hooks/failureMessage";
import {
  addStaffMember,
  fetchStaff,
} from "@/features/staff/services/staffService";

/**
 * Estado do formulário de trazer uma pessoa com cargo.
 *
 * Concentra estado e orquestração; não devolve JSX e não importa componente visual (constituição,
 * Princípio I).
 *
 * A password provisória vive só no state deste hook e some quando a tela fecha: nunca é gravada no
 * aparelho e nunca volta a ser mostrada (FR-019).
 */

export const MESSAGE_ADD_FAILED = "Couldn't add this person. Try again.";

export interface UseAddStaffMemberResult {
  name: string;
  email: string;
  password: string;
  role: StaffRole | null;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setRole: (value: StaffRole) => void;
  /**
   * O condomínio já tem administrador, então essa opção aparece indisponível ANTES de enviar. É
   * cortesia: se a lista não carregou, a opção fica livre e quem recusa é o servidor.
   */
  administratorTaken: boolean;
  canManage: boolean;
  errors: StaffFormErrors;
  /** Recusa que não é de um campo: sem conexão, tentativas demais. */
  submitError: string | null;
  submitting: boolean;
  submit: () => void;
}

export function useAddStaffMember(): UseAddStaffMemberResult {
  const { selectedCondominiumId, currentMembership } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole | null>(null);
  const [administratorTaken, setAdministratorTaken] = useState(false);
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Trava o segundo toque: o state só muda no próximo render, o ref muda na hora (FR-017). */
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const canManage = currentMembership?.role === "manager";

  useEffect(() => {
    if (selectedCondominiumId === null || !canManage) {
      return;
    }
    let cancelled = false;
    fetchStaff(selectedCondominiumId)
      .then((staff) => {
        if (!cancelled) {
          setAdministratorTaken(hasAdministrator(staff));
        }
      })
      .catch(() => {
        // Sem a lista não dá para avisar antes; o servidor recusa do mesmo jeito.
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCondominiumId, canManage]);

  const submit = useCallback(() => {
    if (running.current || selectedCondominiumId === null) {
      return;
    }

    const validation = validateNewStaffMember({ name, email, password, role });
    if (!hasNoErrors(validation) || role === null) {
      setErrors(validation);
      setSubmitError(null);
      return;
    }

    running.current = true;
    setSubmitting(true);
    setErrors({});
    setSubmitError(null);

    addStaffMember(selectedCondominiumId, { name, email, password, role })
      .then(() => {
        // A lista recarrega sozinha ao voltar a ser a tela da frente.
        router.back();
      })
      .catch((error: unknown) => {
        if (!mounted.current) {
          return;
        }
        // Uma falha deixa TUDO como foi digitado; só as mensagens mudam (FR-018).
        const fields =
          error instanceof HttpError && error.type === "validation"
            ? fieldErrorsOf(error.body)
            : null;
        if (fields) {
          setErrors(fields);
        } else {
          setSubmitError(failureMessage(error, MESSAGE_ADD_FAILED));
        }
      })
      .finally(() => {
        running.current = false;
        if (mounted.current) {
          setSubmitting(false);
        }
      });
  }, [selectedCondominiumId, name, email, password, role, router]);

  return {
    name,
    email,
    password,
    role,
    setName,
    setEmail,
    setPassword,
    setRole,
    administratorTaken,
    canManage,
    errors,
    submitError,
    submitting,
    submit,
  };
}
