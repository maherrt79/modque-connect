const { CalculationMethod } = require('adhan');

console.log('CalculationMethod keys:', Object.keys(CalculationMethod));
console.log('Type of CalculationMethod.ISNA:', typeof CalculationMethod.ISNA);

try {
    const params = CalculationMethod.ISNA();
    console.log('CalculationMethod.ISNA() returned:', params);
} catch (e) {
    console.error('Error calling CalculationMethod.ISNA():', e.message);
}
