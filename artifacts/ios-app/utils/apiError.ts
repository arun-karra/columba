import { Alert } from 'react-native';
import { ApiError } from '@workspace/api-client-react';

type ApiErrorBody = {
  error?: {
    message?: string;
    code?: string;
  };
};

const ERROR_TITLES: Record<string, string> = {
  ALREADY_MEMBER: 'Already in the group',
  BAD_REQUEST: 'Something went wrong',
  CANNOT_INVITE_SELF: "Can't invite yourself",
  FORBIDDEN: "You don't have access",
  INVALID_APPLE_TOKEN: 'Sign in failed',
  INVALID_CODE: 'Wrong code',
  MISSING_PARAMETER: 'Missing information',
  NO_NOTIFICATION: 'No notification set',
  NOT_FOUND: 'Not found',
  NOTE_DONE: 'Note already done',
  SCHEMA_OUTDATED: 'Update needed',
  UNAUTHORIZED: 'Sign in required',
  VALIDATION_ERROR: 'Check your input',
};

function titleForStatus(status: number): string {
  if (status === 401) return 'Sign in required';
  if (status === 403) return "You don't have access";
  if (status === 404) return 'Not found';
  if (status >= 500) return 'Server error';
  return 'Something went wrong';
}

function stripHttpStatusPrefix(message: string): string {
  return message.replace(/^HTTP \d{3}[^:]*:\s*/i, '').trim();
}

export function parseApiError(error: unknown): {
  title: string;
  message: string;
  code?: string;
  status?: number;
} {
  if (error instanceof ApiError) {
    const body = error.data as ApiErrorBody | null;
    const code = body?.error?.code;
    const apiMessage = body?.error?.message?.trim();
    const message = stripHttpStatusPrefix(apiMessage || error.message);
    return {
      title: (code && ERROR_TITLES[code]) || titleForStatus(error.status),
      message: message || 'Please try again.',
      code,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Something went wrong',
      message: stripHttpStatusPrefix(error.message) || 'Please try again.',
    };
  }

  return { title: 'Something went wrong', message: 'Please try again.' };
}

export function showApiErrorAlert(
  error: unknown,
  options?: {
    title?: string;
    fallbackMessage?: string;
  },
): void {
  const parsed = parseApiError(error);
  Alert.alert(
    options?.title ?? parsed.title,
    parsed.message || options?.fallbackMessage || 'Please try again.',
  );
}
