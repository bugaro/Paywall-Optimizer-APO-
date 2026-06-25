export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    console.log(message, context ? JSON.stringify(context) : '');
  },
  error(message: string, context?: Record<string, unknown>) {
    console.error(message, context ? JSON.stringify(context) : '');
  },
  warn(message: string, context?: Record<string, unknown>) {
    console.warn(message, context ? JSON.stringify(context) : '');
  },
};
