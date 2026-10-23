import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/rengera_theme.dart';
import '../../theme/rengera_fonts.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({ super.key });

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _showPassword = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _submitting = true; _error = null; });
    // Real auth lands in the next phase (Supabase REST + secure storage).
    // For now: validate shape and route into the app shell.
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() { _submitting = false; });
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your email and password.');
      return;
    }
    context.go('/app');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: RengeraColors.canvas,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Image.asset('assets/logo/logo.png', width: 34, height: 34),
                  const SizedBox(width: 12),
                  Text('RENGERA AI', style: RengeraFonts.wordmark(size: 20)),
                ],
              ),
              const SizedBox(height: 32),
              Text('Sign in to Rengera', style: GoogleFonts.manrope(fontSize: 24, fontWeight: FontWeight.w700, color: RengeraColors.text)),
              const SizedBox(height: 8),
              Text('Use your account to continue, or sign in with administrator credentials.', style: GoogleFonts.manrope(fontSize: 13, color: RengeraColors.muted, height: 1.5)),
              const SizedBox(height: 28),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: RengeraColors.text),
                decoration: const InputDecoration(
                  labelText: 'Email or administrator username',
                  prefixIcon: Icon(Icons.mail_outline, color: RengeraColors.muted),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _password,
                obscureText: !_showPassword,
                style: const TextStyle(color: RengeraColors.text),
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline, color: RengeraColors.muted),
                  suffixIcon: IconButton(
                    icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, color: RengeraColors.muted),
                    onPressed: () => setState(() => _showPassword = !_showPassword),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0x33C5221F),
                    borderRadius: BorderRadius.circular(3),
                    border: Border.all(color: RengeraColors.danger.withValues(alpha: 0.4)),
                  ),
                  child: Text(_error!, style: GoogleFonts.manrope(fontSize: 13, color: const Color(0xFFF0B4B4))),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF09090B)))
                      : const Text('SIGN IN SECURELY'),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Your session is stored in a secure, HTTP-only cookie and expires automatically. Passwords are hashed with scrypt and never stored in plain text.',
                textAlign: TextAlign.center,
                style: GoogleFonts.manrope(fontSize: 11, color: RengeraColors.faint, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
