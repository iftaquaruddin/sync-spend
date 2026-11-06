import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ExpenseTrackerApp());
}

class ExpenseTrackerApp extends StatefulWidget {
  const ExpenseTrackerApp({super.key});

  @override
  State<ExpenseTrackerApp> createState() => _ExpenseTrackerAppState();
}

class _ExpenseTrackerAppState extends State<ExpenseTrackerApp> {
  ThemeMode _themeMode = ThemeMode.light;

  @override
  void initState() {
    super.initState();
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final isDark = prefs.getBool('is_dark_mode') ?? false;
    setState(() {
      _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    });
  }

  void _toggleTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final newMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    await prefs.setBool('is_dark_mode', newMode == ThemeMode.dark);
    setState(() {
      _themeMode = newMode;
    });
  }

  @override
  Widget build(BuildContext context) {
    const primary = Color(0xFF4361EE);
    const slateDark = Color(0xFF0F172A);

    return MaterialApp(
      title: 'SyncSpend Pro',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          primary: primary,
          surface: Colors.white,
          brightness: Brightness.light,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          titleTextStyle: TextStyle(
            color: slateDark,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
          ),
          iconTheme: IconThemeData(color: slateDark),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: primary, width: 2),
          ),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          primary: const Color(0xFF6366F1),
          surface: const Color(0xFF111827),
          brightness: Brightness.dark,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: const Color(0xFF111827),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFF1F2937)),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF111827),
          elevation: 0,
          scrolledUnderElevation: 1,
          titleTextStyle: TextStyle(
            color: Color(0xFFF8FAFC),
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
          ),
          iconTheme: IconThemeData(color: Color(0xFFF8FAFC)),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1F2937),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFF374151)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFF374151)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
          ),
        ),
      ),
      home: RootScreen(
        isDarkMode: _themeMode == ThemeMode.dark,
        onToggleTheme: _toggleTheme,
      ),
    );
  }
}

// User Model
class AuthUser {
  final int id;
  final String username;
  final String fullName;
  final String avatarColor;

  AuthUser({
    required this.id,
    required this.username,
    required this.fullName,
    required this.avatarColor,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      username: json['username'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? json['username'] ?? 'User',
      avatarColor: json['avatarColor'] ?? json['avatar_color'] ?? '#4361EE',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'fullName': fullName,
        'avatarColor': avatarColor,
      };
}

// User Spending Stats Model (Organized by User)
class UserStat {
  final int userId;
  final String username;
  final String fullName;
  final String avatarColor;
  final double total;
  final int count;
  final int percentage;

  UserStat({
    required this.userId,
    required this.username,
    required this.fullName,
    required this.avatarColor,
    required this.total,
    required this.count,
    required this.percentage,
  });

  factory UserStat.fromJson(Map<String, dynamic> json) {
    return UserStat(
      userId: json['userId'] ?? json['id'] ?? json['user_id'] ?? 0,
      username: json['username'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? json['username'] ?? 'User',
      avatarColor: json['avatarColor'] ?? json['avatar_color'] ?? '#4361EE',
      total: (json['total'] is num)
          ? (json['total'] as num).toDouble()
          : (json['totalSpent'] is num ? (json['totalSpent'] as num).toDouble() : 0.0),
      count: json['count'] is int
          ? json['count']
          : (json['expenseCount'] is int ? json['expenseCount'] : 0),
      percentage: json['percentage'] is int ? json['percentage'] : 0,
    );
  }
}

// Expense Model
class Expense {
  final int? id;
  final int? userId;
  final String title;
  final double amount;
  final String category;
  final String date;
  final String notes;
  final String username;
  final String fullName;
  final String avatarColor;

  Expense({
    this.id,
    this.userId,
    required this.title,
    required this.amount,
    required this.category,
    required this.date,
    this.notes = '',
    this.username = '',
    this.fullName = '',
    this.avatarColor = '#4361EE',
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id'],
      userId: json['user_id'],
      title: json['title'] ?? '',
      amount: (json['amount'] is num) ? (json['amount'] as num).toDouble() : 0.0,
      category: json['category'] ?? 'General',
      date: json['date'] ?? '',
      notes: json['notes'] ?? '',
      username: json['username'] ?? '',
      fullName: json['full_name'] ?? json['username'] ?? '',
      avatarColor: json['avatar_color'] ?? '#4361EE',
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'amount': amount,
        'category': category,
        'date': date,
        'notes': notes,
      };
}

// Category Analytics Model
class CategoryStat {
  final String category;
  final double total;
  final int count;
  final int percentage;

  CategoryStat({
    required this.category,
    required this.total,
    required this.count,
    required this.percentage,
  });

  factory CategoryStat.fromJson(Map<String, dynamic> json) {
    return CategoryStat(
      category: json['category'] ?? 'Other',
      total: (json['total'] is num) ? (json['total'] as num).toDouble() : 0.0,
      count: json['count'] is int ? json['count'] : 0,
      percentage: json['percentage'] is int ? json['percentage'] : 0,
    );
  }
}

// Root Screen handling Auth & Main Dashboard
class RootScreen extends StatefulWidget {
  final bool isDarkMode;
  final VoidCallback onToggleTheme;

  const RootScreen({
    super.key,
    required this.isDarkMode,
    required this.onToggleTheme,
  });

  @override
  State<RootScreen> createState() => _RootScreenState();
}

class _RootScreenState extends State<RootScreen> {
  String _serverUrl = 'http://10.0.0.184:3000';
  String? _token;
  AuthUser? _currentUser;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStoredSession();
  }

  Future<void> _loadStoredSession() async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString('server_url') ?? 'http://10.0.0.184:3000';
    final token = prefs.getString('auth_token');
    final userJson = prefs.getString('user_data');

    AuthUser? user;
    if (userJson != null) {
      try {
        user = AuthUser.fromJson(jsonDecode(userJson));
      } catch (_) {}
    }

    setState(() {
      _serverUrl = url;
      _token = token;
      _currentUser = user;
      _isLoading = false;
    });
  }

  void _onLoginSuccess(String token, AuthUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    await prefs.setString('user_data', jsonEncode(user.toJson()));
    setState(() {
      _token = token;
      _currentUser = user;
    });
  }

  void _onLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
    setState(() {
      _token = null;
      _currentUser = null;
    });
  }

  void _onServerUrlChanged(String newUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', newUrl);
    setState(() {
      _serverUrl = newUrl;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_token == null || _currentUser == null) {
      return AuthScreen(
        serverUrl: _serverUrl,
        isDarkMode: widget.isDarkMode,
        onToggleTheme: widget.onToggleTheme,
        onLoginSuccess: _onLoginSuccess,
        onServerUrlChanged: _onServerUrlChanged,
      );
    }

    return DashboardScreen(
      serverUrl: _serverUrl,
      token: _token!,
      currentUser: _currentUser!,
      isDarkMode: widget.isDarkMode,
      onToggleTheme: widget.onToggleTheme,
      onLogout: _onLogout,
      onServerUrlChanged: _onServerUrlChanged,
    );
  }
}

// -------------------------------------------------------------
// 1. AUTH SCREEN (Sign In / Register)
// -------------------------------------------------------------
class AuthScreen extends StatefulWidget {
  final String serverUrl;
  final bool isDarkMode;
  final VoidCallback onToggleTheme;
  final Function(String token, AuthUser user) onLoginSuccess;
  final Function(String newUrl) onServerUrlChanged;

  const AuthScreen({
    super.key,
    required this.serverUrl,
    required this.isDarkMode,
    required this.onToggleTheme,
    required this.onLoginSuccess,
    required this.onServerUrlChanged,
  });

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  bool _isLoading = false;
  bool _obscurePassword = true;

  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameController = TextEditingController();

  Future<void> _submit() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;
    final fullName = _fullNameController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      _showToast('Please enter both username and password', isError: true);
      return;
    }
    if (!_isLogin && fullName.isEmpty) {
      _showToast('Please enter your full name', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final endpoint = _isLogin ? '/api/auth/login' : '/api/auth/register';
      final body = _isLogin
          ? {'username': username, 'password': password}
          : {'username': username, 'password': password, 'fullName': fullName};

      final res = await http.post(
        Uri.parse('${widget.serverUrl}$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 5));

      final data = jsonDecode(res.body);

      if (res.statusCode == 200 || res.statusCode == 201) {
        final token = data['token'];
        final user = AuthUser.fromJson(data['user']);
        widget.onLoginSuccess(token, user);
      } else {
        _showToast(data['error'] ?? 'Authentication failed', isError: true);
      }
    } catch (_) {
      _showToast('Failed to connect to local server at ${widget.serverUrl}', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showToast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.redAccent : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showServerSettings() {
    final c = TextEditingController(text: widget.serverUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Server Wi-Fi Address'),
        content: TextField(
          controller: c,
          decoration: const InputDecoration(labelText: 'Server URL', hintText: 'http://10.0.0.184:3000'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              var input = c.text.trim();
              if (!input.startsWith('http')) input = 'http://$input';
              widget.onServerUrlChanged(input);
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SyncSpend Pro'),
        actions: [
          IconButton(
            icon: Icon(widget.isDarkMode ? Icons.light_mode : Icons.dark_mode),
            tooltip: 'Toggle Theme',
            onPressed: widget.onToggleTheme,
          ),
          IconButton(
            icon: const Icon(Icons.wifi),
            tooltip: 'Server Settings',
            onPressed: _showServerSettings,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF4361EE), Color(0xFF312E81)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4361EE).withValues(alpha: 0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 40),
              ),
              const SizedBox(height: 20),
              const Text(
                'SyncSpend',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.6),
              ),
              const SizedBox(height: 6),
              Text(
                'Private Multi-User Expense Tracker & Bill Scanner',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 28),

              // Sign In / Register Tabs
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isLogin = true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _isLogin ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: _isLogin ? [const BoxShadow(color: Colors.black12, blurRadius: 4)] : null,
                          ),
                          child: Center(
                            child: Text(
                              'Sign In',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: _isLogin ? const Color(0xFF4361EE) : Colors.grey.shade600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isLogin = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !_isLogin ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: !_isLogin ? [const BoxShadow(color: Colors.black12, blurRadius: 4)] : null,
                          ),
                          child: Center(
                            child: Text(
                              'Create Account',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: !_isLogin ? const Color(0xFF4361EE) : Colors.grey.shade600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Form
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      if (!_isLogin) ...[
                        TextField(
                          controller: _fullNameController,
                          decoration: const InputDecoration(
                            labelText: 'Full Name',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],
                      TextField(
                        controller: _usernameController,
                        decoration: const InputDecoration(
                          labelText: 'Username',
                          prefixIcon: Icon(Icons.alternate_email),
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4361EE),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _isLoading ? null : _submit,
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : Text(
                                  _isLogin ? 'Sign In' : 'Create Account',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              if (_isLogin)
                TextButton(
                  onPressed: () {
                    _usernameController.text = 'admin';
                    _passwordController.text = 'admin123';
                  },
                  child: const Text('Autofill demo credentials (admin / admin123)', style: TextStyle(fontSize: 12)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// 2. DASHBOARD SCREEN (Combined & User-Organized)
// -------------------------------------------------------------
class DashboardScreen extends StatefulWidget {
  final String serverUrl;
  final String token;
  final AuthUser currentUser;
  final bool isDarkMode;
  final VoidCallback onToggleTheme;
  final VoidCallback onLogout;
  final Function(String newUrl) onServerUrlChanged;

  const DashboardScreen({
    super.key,
    required this.serverUrl,
    required this.token,
    required this.currentUser,
    required this.isDarkMode,
    required this.onToggleTheme,
    required this.onLogout,
    required this.onServerUrlChanged,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  bool _isOnline = false;
  bool _isSyncing = false;

  // Scope: 'all' (combined), 'me' (personal), or userId string
  String _currentScope = 'all';

  // Data
  List<Expense> _expenses = [];
  List<UserStat> _usersList = [];
  List<CategoryStat> _categoryStats = [];

  double _totalSpent = 0.0;
  double _thisMonthSpent = 0.0;
  double _todaySpent = 0.0;
  int _totalCount = 0;

  // Controllers for Add Tab
  final _amountController = TextEditingController();
  final _titleController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  String _selectedCategory = 'Food & Dining';

  // Search in History
  final _searchController = TextEditingController();
  String _historyCategoryFilter = 'All';

  // OCR Receipt Scanning State
  bool _isOcrScanning = false;
  String? _ocrSuccessMsg;

  // Categories config
  final List<Map<String, dynamic>> _categories = [
    {'name': 'Food & Dining', 'icon': Icons.restaurant, 'color': const Color(0xFFF97316)},
    {'name': 'Groceries', 'icon': Icons.shopping_cart, 'color': const Color(0xFF10B981)},
    {'name': 'Transport', 'icon': Icons.directions_car, 'color': const Color(0xFF3B82F6)},
    {'name': 'Shopping', 'icon': Icons.shopping_bag, 'color': const Color(0xFF8B5CF6)},
    {'name': 'Bills & Utilities', 'icon': Icons.receipt_long, 'color': const Color(0xFFEF4444)},
    {'name': 'Entertainment', 'icon': Icons.movie, 'color': const Color(0xFFF59E0B)},
    {'name': 'Health', 'icon': Icons.local_hospital, 'color': const Color(0xFF14B8A6)},
    {'name': 'Travel', 'icon': Icons.flight, 'color': const Color(0xFF06B6D4)},
    {'name': 'Other', 'icon': Icons.category, 'color': const Color(0xFF64748B)},
  ];

  @override
  void initState() {
    super.initState();
    _refreshAll();
  }

  Map<String, String> get _authHeaders => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${widget.token}',
      };

  Future<void> _refreshAll() async {
    setState(() => _isSyncing = true);
    try {
      final healthRes = await http
          .get(Uri.parse('${widget.serverUrl}/api/health'))
          .timeout(const Duration(seconds: 4));
      if (healthRes.statusCode == 200) {
        setState(() => _isOnline = true);
        await Future.wait([_fetchUsers(), _fetchExpenses(), _fetchSummary()]);
      } else {
        setState(() => _isOnline = false);
      }
    } catch (_) {
      setState(() => _isOnline = false);
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  Future<void> _fetchUsers() async {
    try {
      final res = await http
          .get(Uri.parse('${widget.serverUrl}/api/users'), headers: _authHeaders)
          .timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List<dynamic> list = jsonDecode(res.body);
        setState(() {
          _usersList = list.map((j) => UserStat.fromJson(j)).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchExpenses() async {
    try {
      final res = await http
          .get(Uri.parse('${widget.serverUrl}/api/expenses?userId=$_currentScope'), headers: _authHeaders)
          .timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List<dynamic> list = jsonDecode(res.body);
        setState(() {
          _expenses = list.map((j) => Expense.fromJson(j)).toList();
        });
      } else if (res.statusCode == 401 || res.statusCode == 403) {
        widget.onLogout();
      }
    } catch (_) {}
  }

  Future<void> _fetchSummary() async {
    try {
      final res = await http
          .get(Uri.parse('${widget.serverUrl}/api/summary?userId=$_currentScope'), headers: _authHeaders)
          .timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final List<dynamic> catList = data['byCategory'] ?? [];
        final List<dynamic> userList = data['byUser'] ?? [];

        setState(() {
          _totalSpent = (data['totalSpent'] is num) ? (data['totalSpent'] as num).toDouble() : 0.0;
          _thisMonthSpent = (data['thisMonthSpent'] is num) ? (data['thisMonthSpent'] as num).toDouble() : 0.0;
          _todaySpent = (data['todaySpent'] is num) ? (data['todaySpent'] as num).toDouble() : 0.0;
          _totalCount = data['totalCount'] is int ? data['totalCount'] : 0;
          _categoryStats = catList.map((j) => CategoryStat.fromJson(j)).toList();
          if (userList.isNotEmpty) {
            _usersList = userList.map((j) => UserStat.fromJson(j)).toList();
          }
        });
      }
    } catch (_) {}
  }

  void _setScope(String scope) {
    setState(() => _currentScope = scope);
    _refreshAll();
  }

  Future<void> _addExpense() async {
    final amt = double.tryParse(_amountController.text.trim());
    final title = _titleController.text.trim();

    if (amt == null || amt <= 0) {
      _showToast('Please enter a valid amount', isError: true);
      return;
    }
    if (title.isEmpty) {
      _showToast('Please enter what this expense was for', isError: true);
      return;
    }

    final newExp = Expense(
      title: title,
      amount: amt,
      category: _selectedCategory,
      date: DateFormat('yyyy-MM-dd').format(_selectedDate),
      notes: _notesController.text.trim(),
    );

    try {
      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/expenses'),
        headers: _authHeaders,
        body: jsonEncode(newExp.toJson()),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 201) {
        _showToast('Expense recorded! ✨');
        _amountController.clear();
        _titleController.clear();
        _notesController.clear();
        setState(() => _selectedDate = DateTime.now());
        await _refreshAll();
        setState(() => _currentIndex = 1); // Switch to history
      } else {
        _showToast('Server rejected: ${res.statusCode}', isError: true);
      }
    } catch (_) {
      _showToast('Failed to connect to local server', isError: true);
    }
  }

  Future<void> _deleteExpense(int id) async {
    try {
      final res = await http.delete(
        Uri.parse('${widget.serverUrl}/api/expenses/$id'),
        headers: _authHeaders,
      ).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        _showToast('Expense deleted');
        _refreshAll();
      } else {
        _showToast('Failed to delete expense', isError: true);
      }
    } catch (_) {
      _showToast('Error deleting expense', isError: true);
    }
  }

  void _showToast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.redAccent : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Color _parseColor(String hex) {
    try {
      final buffer = StringBuffer();
      if (hex.length == 6 || hex.length == 7) buffer.write('ff');
      buffer.write(hex.replaceFirst('#', ''));
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (_) {
      return const Color(0xFF4361EE);
    }
  }

  Future<void> _pickAndScanReceipt(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: source, imageQuality: 85);
      if (pickedFile == null) return;

      setState(() {
        _isOcrScanning = true;
        _ocrSuccessMsg = null;
      });

      final bytes = await pickedFile.readAsBytes();
      final uri = Uri.parse('${widget.serverUrl}/api/ocr/scan');

      final request = http.MultipartRequest('POST', uri);
      request.headers.addAll({
        'Authorization': 'Bearer ${widget.token}',
      });
      request.files.add(http.MultipartFile.fromBytes(
        'receipt',
        bytes,
        filename: pickedFile.name,
      ));

      final streamedResponse = await request.send().timeout(const Duration(seconds: 40));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final extracted = data['extracted'];
          final double amt = (extracted['amount'] is num) ? (extracted['amount'] as num).toDouble() : 0.0;
          final String storeName = (extracted['storeName'] ?? extracted['title'] ?? '').toString().trim();
          final String dateStr = (extracted['date'] ?? '').toString().trim();

          // 1. Amount
          if (amt > 0) {
            _amountController.text = amt.toStringAsFixed(2);
          }
          // 2. Store Name
          if (storeName.isNotEmpty) {
            _titleController.text = storeName;
          }
          // 3. Date
          if (dateStr.isNotEmpty) {
            final parsedDate = DateTime.tryParse(dateStr);
            if (parsedDate != null) _selectedDate = parsedDate;
          }

          // Category and Notes are intentionally kept untouched per configuration

          setState(() {
            _ocrSuccessMsg = '✨ $storeName • \$${amt.toStringAsFixed(2)} • $dateStr';
          });
          _showToast('Captured: $storeName (\$${amt.toStringAsFixed(2)})');
        } else {
          _showToast(data['error'] ?? 'OCR could not parse receipt', isError: true);
        }
      } else {
        _showToast('OCR scan failed: ${response.statusCode}', isError: true);
      }
    } catch (_) {
      _showToast('Failed to scan receipt image', isError: true);
    } finally {
      if (mounted) setState(() => _isOcrScanning = false);
    }
  }

  void _showScanOptionsModal() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Scan Bill / Receipt (OCR)',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'Capture bill to extract store name, date, and amount.',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 18),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt, color: Color(0xFF4361EE)),
                ),
                title: const Text('Take Photo with Camera', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Snap receipt directly with camera', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndScanReceipt(ImageSource.camera);
                },
              ),
              const SizedBox(height: 6),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library, color: Color(0xFF10B981)),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Select a saved receipt or invoice screenshot', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndScanReceipt(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getScopeLabel() {
    if (_currentScope == 'all') return '👥 COMBINED (ALL USERS)';
    if (_currentScope == 'me') return '👤 MY EXPENSES';
    final target = _usersList.firstWhere(
      (u) => u.userId.toString() == _currentScope,
      orElse: () => UserStat(userId: 0, username: '', fullName: 'User', avatarColor: '#4361EE', total: 0, count: 0, percentage: 0),
    );
    return '👤 ${target.fullName.toUpperCase()}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFF4361EE),
              child: Text(
                widget.currentUser.fullName.isNotEmpty
                    ? widget.currentUser.fullName[0].toUpperCase()
                    : 'U',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.currentUser.fullName,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                Text(
                  '@${widget.currentUser.username}',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Wi-Fi Connection Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _isOnline ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _isOnline ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
              ),
            ),
            child: Row(
              children: [
                _isSyncing
                    ? const SizedBox(
                        width: 8,
                        height: 8,
                        child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF10B981)),
                      )
                    : Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isOnline ? const Color(0xFF10B981) : Colors.redAccent,
                        ),
                      ),
                const SizedBox(width: 5),
                Text(
                  _isOnline ? (_isSyncing ? 'Syncing...' : 'Online') : 'Offline',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: _isOnline ? const Color(0xFF065F46) : Colors.redAccent,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(widget.isDarkMode ? Icons.light_mode : Icons.dark_mode, size: 20),
            tooltip: 'Toggle Dark/Light Mode',
            onPressed: widget.onToggleTheme,
          ),
          IconButton(
            icon: const Icon(Icons.logout, size: 20, color: Colors.redAccent),
            onPressed: widget.onLogout,
            tooltip: 'Log Out',
          ),
        ],
      ),
      body: Column(
        children: [
          // Scope Switcher Bar (Combined vs Personal vs By User)
          Container(
            color: Theme.of(context).cardTheme.color ?? Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildScopePill('all', '👥 Combined (All Users)'),
                  const SizedBox(width: 8),
                  _buildScopePill('me', '👤 My Expenses'),
                  const SizedBox(width: 8),
                  ..._usersList.map((u) {
                    final isSel = (_currentScope == u.userId.toString());
                    final color = _parseColor(u.avatarColor);
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        avatar: CircleAvatar(
                          backgroundColor: color,
                          radius: 10,
                          child: Text(
                            u.fullName.isNotEmpty ? u.fullName[0].toUpperCase() : 'U',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                        label: Text(u.fullName, style: TextStyle(fontSize: 12, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                        selected: isSel,
                        selectedColor: const Color(0xFF4361EE).withValues(alpha: 0.18),
                        checkmarkColor: const Color(0xFF4361EE),
                        onSelected: (_) => _setScope(u.userId.toString()),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          Divider(height: 1, color: Theme.of(context).dividerColor.withValues(alpha: 0.2)),

          // Body Views
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: [
                _buildAddTab(),
                _buildHistoryTab(),
                _buildUsersTab(),
                _buildAnalyticsTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) {
          setState(() => _currentIndex = idx);
          if (idx == 1 || idx == 2 || idx == 3) _refreshAll();
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: 'Add',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Transactions',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'By User',
          ),
          NavigationDestination(
            icon: Icon(Icons.pie_chart_outline),
            selectedIcon: Icon(Icons.pie_chart),
            label: 'Insights',
          ),
        ],
      ),
    );
  }

  Widget _buildScopePill(String scopeValue, String label) {
    final isSelected = (_currentScope == scopeValue);
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          color: isSelected ? Colors.white : const Color(0xFF64748B),
        ),
      ),
      selected: isSelected,
      selectedColor: const Color(0xFF4361EE),
      backgroundColor: const Color(0xFFF1F5F9),
      side: BorderSide(color: isSelected ? const Color(0xFF4361EE) : const Color(0xFFE2E8F0)),
      showCheckmark: false,
      onSelected: (_) => _setScope(scopeValue),
    );
  }

  // -------------------------------------------------------------
  // TAB 1: ADD EXPENSE VIEW
  // -------------------------------------------------------------
  Widget _buildAddTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Executive Summary Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF4338CA)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF312E81).withValues(alpha: 0.35),
                  blurRadius: 15,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _getScopeLabel(),
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '\$${_totalSpent.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('THIS MONTH', style: TextStyle(color: Colors.indigo.shade200, fontSize: 10, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text('\$${_thisMonthSpent.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('TODAY', style: TextStyle(color: Colors.indigo.shade200, fontSize: 10, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text('\$${_todaySpent.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('ITEMS', style: TextStyle(color: Colors.indigo.shade200, fontSize: 10, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text('$_totalCount', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Smart Receipt Scanner Card
          Card(
            color: const Color(0xFFF8FAFC),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: const Color(0xFF4361EE).withValues(alpha: 0.25), width: 1.5),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.document_scanner, color: Color(0xFF4361EE), size: 22),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Smart Bill Scanner',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            Text(
                              'Capture bill to extract store name, date & amount',
                              style: TextStyle(color: Colors.grey, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      if (_isOcrScanning)
                        const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      else
                        ElevatedButton.icon(
                          onPressed: _showScanOptionsModal,
                          icon: const Icon(Icons.camera_alt, size: 16),
                          label: const Text('Scan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4361EE),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                    ],
                  ),
                  if (_isOcrScanning) ...[
                    const SizedBox(height: 10),
                    const LinearProgressIndicator(),
                    const SizedBox(height: 6),
                    const Center(
                      child: Text(
                        'Processing receipt image with OCR engine...',
                        style: TextStyle(fontSize: 11, color: Color(0xFF4361EE), fontStyle: FontStyle.italic),
                      ),
                    ),
                  ],
                  if (_ocrSuccessMsg != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, color: Color(0xFF059669), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _ocrSuccessMsg!,
                              style: const TextStyle(color: Color(0xFF065F46), fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() => _ocrSuccessMsg = null),
                            child: const Icon(Icons.close, size: 14, color: Color(0xFF059669)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Amount Card Input
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Amount', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.attach_money, color: Color(0xFF4361EE), size: 26),
                      hintText: '0.00',
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: [5, 10, 25, 50, 100].map((val) {
                      return ActionChip(
                        label: Text('+\$$val', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        backgroundColor: const Color(0xFFEEF2FF),
                        labelStyle: const TextStyle(color: Color(0xFF4361EE)),
                        side: BorderSide.none,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        onPressed: () {
                          final current = double.tryParse(_amountController.text) ?? 0.0;
                          _amountController.text = (current + val).toStringAsFixed(2);
                        },
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Title & Quick Tags
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Description / Merchant', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Starbucks, Grocery, Shell Petrol',
                      prefixIcon: Icon(Icons.edit_note),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    children: ['Lunch', 'Coffee', 'Groceries', 'Fuel', 'Dinner', 'Uber'].map((tag) {
                      return ActionChip(
                        label: Text(tag, style: const TextStyle(fontSize: 11)),
                        onPressed: () => _titleController.text = tag,
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Category & Date Picker
          Row(
            children: [
              Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _selectedCategory,
                        items: _categories.map((c) {
                          final color = c['color'] as Color;
                          return DropdownMenuItem<String>(
                            value: c['name'],
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 12,
                                  backgroundColor: color.withValues(alpha: 0.15),
                                  child: Icon(c['icon'], size: 14, color: color),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    c['name'],
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedCategory = val);
                        },
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2030),
                    );
                    if (picked != null) setState(() => _selectedDate = picked);
                  },
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 16, color: Color(0xFF4361EE)),
                          const SizedBox(width: 8),
                          Text(
                            DateFormat('MMM dd, yyyy').format(_selectedDate),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Notes
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _notesController,
                decoration: const InputDecoration(
                  hintText: 'Additional notes or invoice details (optional)',
                  prefixIcon: Icon(Icons.notes),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4361EE),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 2,
              ),
              onPressed: _addExpense,
              icon: const Icon(Icons.check_circle_outline),
              label: const Text(
                'Record to Local Server',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 2: TRANSACTIONS HISTORY VIEW
  // -------------------------------------------------------------
  Widget _buildHistoryTab() {
    final query = _searchController.text.trim().toLowerCase();
    final filtered = _expenses.where((e) {
      final matchesQuery = e.title.toLowerCase().contains(query) || 
                           e.notes.toLowerCase().contains(query) ||
                           e.fullName.toLowerCase().contains(query);
      final matchesCategory = (_historyCategoryFilter == 'All') || (e.category == _historyCategoryFilter);
      return matchesQuery && matchesCategory;
    }).toList();

    return RefreshIndicator(
      onRefresh: _refreshAll,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      hintText: 'Search merchant or user...',
                      prefixIcon: Icon(Icons.search, size: 20),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: _historyCategoryFilter,
                  underline: const SizedBox(),
                  items: ['All', ..._categories.map((c) => c['name'] as String)].map((name) {
                    return DropdownMenuItem(value: name, child: Text(name, style: const TextStyle(fontSize: 12)));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _historyCategoryFilter = val);
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long, size: 54, color: Colors.grey.shade400),
                        const SizedBox(height: 8),
                        Text('No transactions found for this scope', style: TextStyle(color: Colors.grey.shade600)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: filtered.length,
                    separatorBuilder: (_, index) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      final cat = _categories.firstWhere(
                        (c) => c['name'] == item.category,
                        orElse: () => {'icon': Icons.category, 'color': const Color(0xFF64748B)},
                      );
                      final color = cat['color'] as Color;
                      final userColor = _parseColor(item.avatarColor);
                      final displayName = item.fullName.isNotEmpty ? item.fullName : (item.username.isNotEmpty ? item.username : 'User');

                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: color.withValues(alpha: 0.15),
                            child: Icon(cat['icon'], color: color, size: 20),
                          ),
                          title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 3),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: userColor.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '👤 $displayName',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: userColor),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '${item.date} • ${item.category}',
                                    style: const TextStyle(fontSize: 11, color: Colors.black54),
                                  ),
                                ],
                              ),
                              if (item.notes.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(item.notes, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '\$${item.amount.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 20, color: Colors.grey),
                                onPressed: () {
                                  if (item.id != null) {
                                    _confirmDelete(item.id!);
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(int id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Expense?'),
        content: const Text('Are you sure you want to delete this transaction?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _deleteExpense(id);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 3: ORGANIZED BY USER (Leaderboard & Breakdown)
  // -------------------------------------------------------------
  Widget _buildUsersTab() {
    return RefreshIndicator(
      onRefresh: _refreshAll,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Expenses Organized by User',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Text(
              'Spending distribution across all members. Tap any user to filter expenses.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            if (_usersList.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(
                    child: Text('No users found', style: TextStyle(color: Colors.grey.shade600)),
                  ),
                ),
              )
            else
              ..._usersList.map((u) {
                final color = _parseColor(u.avatarColor);
                final initial = u.fullName.isNotEmpty ? u.fullName[0].toUpperCase() : 'U';
                final isSelected = (_currentScope == u.userId.toString());

                return Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isSelected ? const Color(0xFF4361EE) : const Color(0xFFE2E8F0),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      _setScope(u.userId.toString());
                      setState(() => _currentIndex = 1); // Jump to transactions
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 20,
                                backgroundColor: color,
                                child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      u.fullName,
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                    ),
                                    Text(
                                      '@${u.username} • ${u.count} item${u.count == 1 ? '' : 's'}',
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '\$${u.total.toStringAsFixed(2)}',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                                  ),
                                  Text(
                                    '${u.percentage}% of combined',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.indigo.shade600),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: (u.percentage / 100).clamp(0.0, 1.0),
                              minHeight: 6,
                              backgroundColor: Colors.grey.shade100,
                              valueColor: AlwaysStoppedAnimation<Color>(color),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 4: CATEGORY INSIGHTS VIEW
  // -------------------------------------------------------------
  Widget _buildAnalyticsTab() {
    return RefreshIndicator(
      onRefresh: _refreshAll,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Category Spending',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                Text(
                  _getScopeLabel(),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.indigo.shade600),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_categoryStats.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(
                    child: Text('No expenses recorded for this scope', style: TextStyle(color: Colors.grey.shade600)),
                  ),
                ),
              )
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: _categoryStats.map((stat) {
                      final cat = _categories.firstWhere(
                        (c) => c['name'] == stat.category,
                        orElse: () => {'icon': Icons.category, 'color': const Color(0xFF64748B)},
                      );
                      final color = cat['color'] as Color;

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(cat['icon'], size: 16, color: color),
                                    const SizedBox(width: 6),
                                    Text(stat.category, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                    const SizedBox(width: 4),
                                    Text('(${stat.count})', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                                  ],
                                ),
                                Text(
                                  '\$${stat.total.toStringAsFixed(2)} (${stat.percentage}%)',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: (stat.percentage / 100).clamp(0.0, 1.0),
                                minHeight: 8,
                                backgroundColor: Colors.grey.shade100,
                                valueColor: AlwaysStoppedAnimation<Color>(color),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _amountController.dispose();
    _titleController.dispose();
    _notesController.dispose();
    _searchController.dispose();
    super.dispose();
  }
}
