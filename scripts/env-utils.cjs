function updateEnv(source, changes) {
  let output = source;
  for (const [key, value] of Object.entries(changes)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || typeof value !== 'string' || /[\r\n"]/.test(value)) throw new Error('Nilai konfigurasi tidak valid.');
    const pattern = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[^\\r\\n]*`, 'gm');
    const line = `${key}="${value}"`;
    output = pattern.test(output) ? output.replace(pattern, () => line) : `${output.replace(/\s*$/, '')}\n${line}\n`;
  }
  return output;
}
module.exports = { updateEnv };
