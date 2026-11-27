import { fetchPrice } from '../lib/fetchPrice';

const url = process.argv[2] || 'https://a.co/d/08n7ye2q';

fetchPrice(url).then((result) => console.log('Result:', result));