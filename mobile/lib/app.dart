import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'theme/rengera_theme.dart';
import 'theme/rengera_fonts.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/shell/app_shell.dart';

/// Reads the persisted onboarding flag and picks the initial route.
Future<String> initialRoute() async {
  final prefs = await SharedPreferences.getInstance();
  final seen = prefs.getBool('rengera_onboarded_v1') ?? false;
  final token = prefs.getString('rengera_access_token');
  if (token != null && token.isNotEmpty) return '/app';
  return seen ? '/login' : '/onboarding';
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) async {
      if (state.matchedLocation == '/splash') {
        final target = await initialRoute();
        return target;
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/app', builder: (_, __) => const AppShell()),
    ],
  );
});

class SplashScreen extends StatelessWidget {
  const SplashScreen({ super.key });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: RengeraColors.canvas,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/logo/logo.png', width: 72, height: 72),
            const SizedBox(height: 18),
            Text('RENGERA AI', style: RengeraFonts.wordmark(size: 26)),
            const SizedBox(height: 6),
            Text(
              'Rwanda legal AI',
              style: RengeraFonts.sectionLabel(size: 10).copyWith(color: RengeraColors.gold),
            ),
          ],
        ),
      ),
    );
  }
}

class RengeraApp extends ConsumerWidget {
  const RengeraApp({ super.key });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Rengera AI',
      debugShowCheckedModeBanner: false,
      theme: RengeraTheme.dark(),
      darkTheme: RengeraTheme.dark(),
      themeMode: ThemeMode.dark,
      routerConfig: router,
    );
  }
}
