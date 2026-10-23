import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme/rengera_theme.dart';
import '../../theme/rengera_fonts.dart';

const _slides = <({String icon, String title, String body})>[
  (icon: 'chat', title: 'Ask the law', body: 'Describe your problem in plain language. Rengera answers with the exact article, in Kinyarwanda, English or French.'),
  (icon: 'book', title: 'Read the official text', body: 'Every answer cites the law and article it came from. The full library of Rwandan laws is one tap away.'),
  (icon: 'shield', title: 'Stay safe', body: 'Emergencies route you straight to the right authority. Nothing is binding advice — the official sources always come first.'),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({ super.key });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _active = 0;

  void _finish(BuildContext context) {
    // Persisted in SharedPreferences by the caller via router redirect next time.
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final slide = _slides[_active];
    final last = _active == _slides.length - 1;
    return Scaffold(
      backgroundColor: RengeraColors.canvas,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                children: [
                  Image.asset('assets/logo/logo.png', width: 34, height: 34),
                  const SizedBox(width: 12),
                  Text('RENGERA AI', style: RengeraFonts.wordmark(size: 18)),
                  const Spacer(),
                  TextButton(
                    onPressed: () => _finish(context),
                    child: Text('Skip', style: GoogleFonts.manrope(fontWeight: FontWeight.w700, fontSize: 11, letterSpacing: 1.6, color: RengeraColors.muted)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: RengeraColors.gold.withValues(alpha: 0.4)),
                        color: RengeraColors.gold.withValues(alpha: 0.1),
                      ),
                      child: Icon(_iconFor(slide.icon), size: 34, color: RengeraColors.gold),
                    ),
                    const SizedBox(height: 32),
                    Text(slide.title, style: GoogleFonts.manrope(fontSize: 30, fontWeight: FontWeight.w700, color: RengeraColors.text)),
                    const SizedBox(height: 16),
                    Text(slide.body, textAlign: TextAlign.center, style: GoogleFonts.manrope(fontSize: 14, height: 1.5, color: RengeraColors.muted)),
                    const SizedBox(height: 48),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_slides.length, (i) => GestureDetector(
                        onTap: () => setState(() => _active = i),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: i == _active ? 32 : 8,
                          height: 6,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(3),
                            color: i == _active ? RengeraColors.gold : RengeraColors.panel2,
                          ),
                        ),
                      )),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 0, 32, 40),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => last ? _finish(context) : setState(() => _active++),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: RengeraColors.gold,
                    foregroundColor: const Color(0xFF09090B),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2, fontSize: 11),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(last ? 'GET STARTED' : 'NEXT'),
                      const SizedBox(width: 8),
                      const Icon(Icons.chevron_right, size: 16),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconFor(String key) {
    switch (key) {
      case 'chat': return Icons.chat_bubble_outline;
      case 'book': return LucideIcons.bookOpen;
      case 'shield': return LucideIcons.shieldCheck;
    }
    return LucideIcons.circle;
  }
}
