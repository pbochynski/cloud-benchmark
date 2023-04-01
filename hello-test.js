import http from 'k6/http';
import { check } from 'k6';

export default function() {
  let response = http.get('http://localhost:3000');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response body': (r) => r.body === 'Hello World!',
  });
}
