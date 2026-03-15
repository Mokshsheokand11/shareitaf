// Using native fetch

async function testUpload() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const CRLF = '\r\n';
  
  // Create a dummy png content
  const fileContent = 'dummy content';
  
  let postData = '';
  postData += '--' + boundary + CRLF;
  postData += 'Content-Disposition: form-data; name="uploaderName"' + CRLF + CRLF;
  postData += 'Test User' + CRLF;
  
  postData += '--' + boundary + CRLF;
  postData += 'Content-Disposition: form-data; name="password"' + CRLF + CRLF;
  postData += 'testpass' + CRLF;
  
  postData += '--' + boundary + CRLF;
  postData += 'Content-Disposition: form-data; name="file"; filename="test.png"' + CRLF;
  postData += 'Content-Type: image/png' + CRLF + CRLF;
  postData += fileContent + CRLF;
  postData += '--' + boundary + '--' + CRLF;

  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary
      },
      body: postData
    });
    const result = await response.text();
    console.log('Status Code:', response.status);
    console.log('Response Body:', result);
  } catch(e) {
    console.error('Fetch error:', e);
  }
}

testUpload();
