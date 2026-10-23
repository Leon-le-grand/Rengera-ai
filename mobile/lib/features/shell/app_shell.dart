import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../theme/rengera_theme.dart';
import '../../theme/rengera_fonts.dart';

class AppShell extends StatelessWidget {
  const AppShell({ super.key });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: RengeraColors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Image.asset('assets/logo/logo.png', width: 34, height: 34),
                  const SizedBox(width: 12),
                  Text('RENGERA AI', style: RengeraFonts.wordmark(size: 20)),
                ],
              ),
              const SizedBox(height: 40),
              Text('Welcome to Rengera', style: GoogleFonts.manrope(fontSize: 28, fontWeight: FontWeight.w700, color: RengeraColors.text)),
              const SizedBox(height: 12),
              Text(
                'Chat, library, reader and notifications are wired in the next phase. '
                'This shell proves the design, theme and routing parity with the web app.',
                style: GoogleFonts.manrope(fontSize: 14, color: RengeraColors.muted, height: 1.5),
              ),
              const SizedBox(height: 32),
              _Tile(icon: LucideIcons.messageSquare, label: 'AI Assistant', subtitle: 'Chat with cited answers'),
              const SizedBox(height: 12),
              _Tile(icon: LucideIcons.bookOpen, label: 'Law Library', subtitle: 'Browse laws by category'),
              const SizedBox(height: 12),
              _Tile(icon: LucideIcons.bell, label: 'Notifications', subtitle: 'For you today + alerts'),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.go('/login'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: RengeraColors.gold,
                    side: const BorderSide(color: RengeraColors.gold),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
                  ),
                  child: const Text('SIGN OUT'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  const _Tile({required this.icon, required this.label, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: RengeraColors.panel,
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: RengeraColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, color: RengeraColors.gold, size: 22),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700, color: RengeraColors.text)),
              const SizedBox(height: 2),
              Text(subtitle, style: GoogleFonts.manrope(fontSize: 12, color: RengeraColors.muted)),
            ],
          ),
        ],
      ),
    );
  }
}
