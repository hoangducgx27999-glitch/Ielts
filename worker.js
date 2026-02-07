// Cloudflare Worker - API Backend for IELTS Game
// Deploy này lên Cloudflare Workers và kết nối với D1 Database

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      let response;

      // Router
      if (path === '/api/register' && request.method === 'POST') {
        response = await handleRegister(request, env);
      } else if (path === '/api/login' && request.method === 'POST') {
        response = await handleLogin(request, env);
      } else if (path === '/api/user' && request.method === 'GET') {
        response = await handleGetUser(request, env);
      } else if (path === '/api/user/upgrade' && request.method === 'POST') {
        response = await handleUpgradeVIP(request, env);
      } else if (path === '/api/user/stats' && request.method === 'PUT') {
        response = await handleUpdateStats(request, env);
      } else if (path === '/api/user/question-count' && request.method === 'PUT') {
        response = await handleUpdateQuestionCount(request, env);
      } else if (path === '/api/payment/create' && request.method === 'POST') {
        response = await handleCreatePayment(request, env);
      } else if (path === '/api/payment/verify' && request.method === 'POST') {
        response = await handleVerifyPayment(request, env);
      } else {
        response = new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Add CORS headers to response
      Object.keys(corsHeaders).forEach(key => {
        response.headers.set(key, corsHeaders[key]);
      });

      return response;
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// ===== AUTHENTICATION HANDLERS =====

async function handleRegister(request, env) {
  const { username, password } = await request.json();

  // Validation
  if (!username || !password) {
    return jsonResponse({ success: false, message: 'Thiếu thông tin!' }, 400);
  }

  if (username.length < 3 || username.length > 20) {
    return jsonResponse({ success: false, message: 'Tên đăng nhập phải từ 3-20 ký tự!' }, 400);
  }

  if (password.length < 6) {
    return jsonResponse({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }, 400);
  }

  // Check if username exists
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first();

  if (existingUser) {
    return jsonResponse({ success: false, message: 'Tên đăng nhập đã tồn tại!' }, 400);
  }

  // Hash password (simple hash - in production use bcrypt)
  const hashedPassword = await hashPassword(password);

  // Insert new user
  await env.DB.prepare(`
    INSERT INTO users (username, password, is_vip, question_count, created_at)
    VALUES (?, ?, 0, 0, datetime('now'))
  `).bind(username, hashedPassword).run();

  return jsonResponse({
    success: true,
    message: 'Đăng ký thành công!'
  });
}

async function handleLogin(request, env) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return jsonResponse({ success: false, message: 'Thiếu thông tin!' }, 400);
  }

  // Get user from database
  const user = await env.DB.prepare(`
    SELECT id, username, password, is_vip, question_count, created_at
    FROM users
    WHERE username = ?
  `).bind(username).first();

  if (!user) {
    return jsonResponse({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng!' }, 401);
  }

  // Verify password
  const hashedPassword = await hashPassword(password);
  if (user.password !== hashedPassword) {
    return jsonResponse({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng!' }, 401);
  }

  // Generate session token
  const token = await generateToken(user.id);

  // Save session
  await env.DB.prepare(`
    INSERT INTO sessions (user_id, token, created_at, expires_at)
    VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))
  `).bind(user.id, token).run();

  return jsonResponse({
    success: true,
    message: 'Đăng nhập thành công!',
    token: token,
    user: {
      id: user.id,
      username: user.username,
      isVIP: user.is_vip === 1,
      questionCount: user.question_count,
      createdAt: user.created_at
    }
  });
}

async function handleGetUser(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, message: 'Không có token!' }, 401);
  }

  // Verify session
  const session = await env.DB.prepare(`
    SELECT s.user_id, u.username, u.is_vip, u.question_count, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first();

  if (!session) {
    return jsonResponse({ success: false, message: 'Session không hợp lệ!' }, 401);
  }

  return jsonResponse({
    success: true,
    user: {
      id: session.user_id,
      username: session.username,
      isVIP: session.is_vip === 1,
      questionCount: session.question_count,
      createdAt: session.created_at
    }
  });
}

// ===== USER UPDATE HANDLERS =====

async function handleUpdateQuestionCount(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { count } = await request.json();

  if (!token) {
    return jsonResponse({ success: false, message: 'Không có token!' }, 401);
  }

  const session = await verifySession(token, env);
  if (!session) {
    return jsonResponse({ success: false, message: 'Session không hợp lệ!' }, 401);
  }

  // Update question count
  await env.DB.prepare(`
    UPDATE users
    SET question_count = ?
    WHERE id = ?
  `).bind(count, session.user_id).run();

  return jsonResponse({ success: true, count });
}

async function handleUpdateStats(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { stats } = await request.json();

  if (!token) {
    return jsonResponse({ success: false, message: 'Không có token!' }, 401);
  }

  const session = await verifySession(token, env);
  if (!session) {
    return jsonResponse({ success: false, message: 'Session không hợp lệ!' }, 401);
  }

  // Update stats in database
  await env.DB.prepare(`
    UPDATE users
    SET 
      total_words = ?,
      correct_answers = ?,
      wrong_answers = ?,
      accuracy = ?,
      streak = ?
    WHERE id = ?
  `).bind(
    stats.totalWords || 0,
    stats.correctAnswers || 0,
    stats.wrongAnswers || 0,
    stats.accuracy || 0,
    stats.streak || 0,
    session.user_id
  ).run();

  return jsonResponse({ success: true });
}

async function handleUpgradeVIP(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, message: 'Không có token!' }, 401);
  }

  const session = await verifySession(token, env);
  if (!session) {
    return jsonResponse({ success: false, message: 'Session không hợp lệ!' }, 401);
  }

  // Upgrade to VIP
  await env.DB.prepare(`
    UPDATE users
    SET is_vip = 1
    WHERE id = ?
  `).bind(session.user_id).run();

  return jsonResponse({
    success: true,
    message: 'Nâng cấp VIP thành công!'
  });
}

// ===== PAYMENT HANDLERS =====

async function handleCreatePayment(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { amount, method } = await request.json();

  if (!token) {
    return jsonResponse({ success: false, message: 'Không có token!' }, 401);
  }

  const session = await verifySession(token, env);
  if (!session) {
    return jsonResponse({ success: false, message: 'Session không hợp lệ!' }, 401);
  }

  // Create payment record
  const paymentId = generatePaymentId();
  
  await env.DB.prepare(`
    INSERT INTO payments (payment_id, user_id, amount, method, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', datetime('now'))
  `).bind(paymentId, session.user_id, amount, method).run();

  // Store payment info in KV for verification
  await env.PAYMENTS.put(paymentId, JSON.stringify({
    userId: session.user_id,
    amount: amount,
    method: method,
    status: 'pending',
    createdAt: new Date().toISOString()
  }), { expirationTtl: 86400 }); // 24 hours

  return jsonResponse({
    success: true,
    paymentId: paymentId,
    message: 'Vui lòng chuyển khoản theo thông tin sau:',
    paymentInfo: {
      bank: 'MB Bank',
      accountNumber: '0343767490',
      accountName: 'NGUYEN VAN A',
      amount: amount,
      content: `IELTS ${paymentId}`
    }
  });
}

async function handleVerifyPayment(request, env) {
  const { paymentId, transactionCode } = await request.json();

  if (!paymentId) {
    return jsonResponse({ success: false, message: 'Thiếu mã thanh toán!' }, 400);
  }

  // Get payment info from KV
  const paymentData = await env.PAYMENTS.get(paymentId);
  if (!paymentData) {
    return jsonResponse({ success: false, message: 'Không tìm thấy giao dịch!' }, 404);
  }

  const payment = JSON.parse(paymentData);

  // TODO: Thực tế cần verify với bank API
  // Ở đây là demo nên admin phải manual verify

  // Update payment status
  await env.DB.prepare(`
    UPDATE payments
    SET status = 'verified', transaction_code = ?, verified_at = datetime('now')
    WHERE payment_id = ?
  `).bind(transactionCode || 'manual', paymentId).run();

  // Upgrade user to VIP
  await env.DB.prepare(`
    UPDATE users
    SET is_vip = 1
    WHERE id = ?
  `).bind(payment.userId).run();

  // Update KV
  payment.status = 'verified';
  await env.PAYMENTS.put(paymentId, JSON.stringify(payment));

  return jsonResponse({
    success: true,
    message: 'Xác nhận thanh toán thành công! Tài khoản đã được nâng cấp VIP.'
  });
}

// ===== HELPER FUNCTIONS =====

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateToken(userId) {
  const randomData = new Uint8Array(32);
  crypto.getRandomValues(randomData);
  const tokenString = userId + '-' + Array.from(randomData)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenString);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generatePaymentId() {
  return 'PAY' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();
}

async function verifySession(token, env) {
  return await env.DB.prepare(`
    SELECT user_id
    FROM sessions
    WHERE token = ? AND expires_at > datetime('now')
  `).bind(token).first();
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}
