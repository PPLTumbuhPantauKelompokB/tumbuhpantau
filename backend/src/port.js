export function parsePort(value = '3001') {
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT harus angka antara 1 hingga 65535.');
  }
  return port;
}
