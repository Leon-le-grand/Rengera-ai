import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../theme/rengera_theme.dart';
import '../../theme/rengera_fonts.dart';

class AppShell extends StatefulWidget {
  const AppShell({ super.key });

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;
  final List<String> _recentChats = [
    'Explain Article 43 of Law 027/2023',
    'Tenant locked out by landlord',
    'Overtime pay rights',
  ];
  bool _chatSidebarOpen = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: RengeraColors.canvas,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: RengeraColors.border)),
              ),
              child: Row(
                children: [
                  Image.asset('assets/logo/logo.png', width: 28, height: 28),
                  const SizedBox(width: 10),
                  Text('RENGERA', style: RengeraFonts.wordmark(size: 18)),
                  const Spacer(),
                  if (_index == 0)
                    IconButton(
                      icon: const Icon(LucideIcons.menu, color: RengeraColors.muted, size: 20),
                      onPressed: () => setState(() => _chatSidebarOpen = !_chatSidebarOpen),
                    ),
                ],
              ),
            ),
            // Body
            Expanded(
              child: Stack(
                children: [
                  IndexedStack(
                    index: _index,
                    children: [
                      _AiTab(recentChats: _recentChats),
                      _LawsTab(),
                      _SettingsTab(),
                    ],
                  ),
                  // Recent chats sidebar (slides in over AI tab)
                  if (_chatSidebarOpen)
                    GestureDetector(
                      onTap: () => setState(() => _chatSidebarOpen = false),
                      child: Container(color: Colors.black54),
                    ),
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOut,
                    left: _chatSidebarOpen ? 0 : -260,
                    top: 0,
                    bottom: 0,
                    width: 260,
                    child: _RecentChatsSidebar(
                      chats: _recentChats,
                      onClose: () => setState(() => _chatSidebarOpen = false),
                      onNewChat: () {
                        setState(() => _chatSidebarOpen = false);
                      },
                    ),
                  ),
                ],
              ),
            ),
            // Bottom nav bar (Telegram-style)
            Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: RengeraColors.border)),
                color: RengeraColors.panel,
              ),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _NavItem(icon: LucideIcons.messageSquare, label: 'AI', active: _index == 0, onTap: () => setState(() => _index = 0)),
                      _NavItem(icon: LucideIcons.bookOpen, label: 'Laws', active: _index == 1, onTap: () => setState(() => _index = 1)),
                      _NavItem(icon: LucideIcons.settings, label: 'Settings', active: _index == 2, onTap: () => setState(() => _index = 2)),
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
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _NavItem({required this.icon, required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 22, color: active ? RengeraColors.gold : RengeraColors.muted),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.manrope(
                fontSize: 10,
                fontWeight: active ? FontWeight.w800 : FontWeight.w500,
                color: active ? RengeraColors.gold : RengeraColors.muted,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AiTab extends StatelessWidget {
  final List<String> recentChats;
  const _AiTab({required this.recentChats});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Muraho! I am Rengera.', style: GoogleFonts.manrope(fontSize: 22, fontWeight: FontWeight.w700, color: RengeraColors.text)),
          const SizedBox(height: 8),
          Text('Describe your situation in any language. I will read the official Rwandan laws, quote the exact article, and tell you what to do next.', style: GoogleFonts.manrope(fontSize: 13, color: RengeraColors.muted, height: 1.5)),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: RengeraColors.panel,
              borderRadius: BorderRadius.circular(3),
              border: Border.all(color: RengeraColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('RECENT CHATS', style: GoogleFonts.manrope(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2, color: RengeraColors.muted)),
                const SizedBox(height: 12),
                ...recentChats.map((c) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.messageSquare, size: 14, color: RengeraColors.gold),
                      const SizedBox(width: 10),
                      Expanded(child: Text(c, style: GoogleFonts.manrope(fontSize: 13, color: RengeraColors.text2), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ],
                  ),
                )),
              ],
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: RengeraColors.gold,
                foregroundColor: const Color(0xFF09090B),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
                textStyle: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2, fontSize: 11),
              ),
              child: const Text('NEW CHAT'),
            ),
          ),
        ],
      ),
    );
  }
}

class _LawsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Law Library', style: GoogleFonts.manrope(fontSize: 22, fontWeight: FontWeight.w700, color: RengeraColors.text)),
          const SizedBox(height: 8),
          Text('Browse official Rwandan laws by category.', style: GoogleFonts.manrope(fontSize: 13, color: RengeraColors.muted)),
          const SizedBox(height: 24),
          _LawCard(title: 'Labour Law', subtitle: '66/2018 + amendments', count: '43 articles'),
          const SizedBox(height: 12),
          _LawCard(title: 'Land Law', subtitle: 'Land registration & tenure', count: '120 articles'),
          const SizedBox(height: 12),
          _LawCard(title: 'Family Law', subtitle: 'Marriage, divorce, succession', count: '89 articles'),
        ],
      ),
    );
  }
}

class _LawCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String count;
  const _LawCard({required this.title, required this.subtitle, required this.count});

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
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(3),
              color: RengeraColors.gold.withValues(alpha: 0.12),
              border: Border.all(color: RengeraColors.gold.withValues(alpha: 0.3)),
            ),
            child: const Icon(LucideIcons.bookOpen, color: RengeraColors.gold, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700, color: RengeraColors.text)),
                const SizedBox(height: 2),
                Text(subtitle, style: GoogleFonts.manrope(fontSize: 12, color: RengeraColors.muted)),
              ],
            ),
          ),
          Text(count, style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w700, color: RengeraColors.gold)),
        ],
      ),
    );
  }
}

class _SettingsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Settings', style: GoogleFonts.manrope(fontSize: 22, fontWeight: FontWeight.w700, color: RengeraColors.text)),
          const SizedBox(height: 24),
          _SettingRow(label: 'Language', value: 'Kinyarwanda'),
          _SettingRow(label: 'Theme', value: 'Dark'),
          _SettingRow(label: 'Account', value: 'Not signed in'),
          const SizedBox(height: 24),
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
              child: const Text('SIGN IN'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingRow extends StatelessWidget {
  final String label;
  final String value;
  const _SettingRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: RengeraColors.panel,
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: RengeraColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.manrope(fontSize: 14, color: RengeraColors.text)),
          Text(value, style: GoogleFonts.manrope(fontSize: 13, color: RengeraColors.muted)),
        ],
      ),
    );
  }
}

class _RecentChatsSidebar extends StatelessWidget {
  final List<String> chats;
  final VoidCallback onClose;
  final VoidCallback onNewChat;
  const _RecentChatsSidebar({required this.chats, required this.onClose, required this.onNewChat});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: RengeraColors.panel,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Row(
                children: [
                  Text('Recent chats', style: GoogleFonts.manrope(fontSize: 15, fontWeight: FontWeight.w700, color: RengeraColors.text)),
                  const Spacer(),
                  IconButton(icon: const Icon(LucideIcons.x, size: 18, color: RengeraColors.muted), onPressed: onClose),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ElevatedButton.icon(
                onPressed: onNewChat,
                icon: const Icon(LucideIcons.plus, size: 16),
                label: const Text('New chat'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: RengeraColors.gold,
                  foregroundColor: const Color(0xFF09090B),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Divider(color: RengeraColors.border, height: 1),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(8),
                itemCount: chats.length,
                itemBuilder: (_, i) => ListTile(
                  dense: true,
                  leading: const Icon(LucideIcons.messageSquare, size: 16, color: RengeraColors.muted),
                  title: Text(chats[i], style: GoogleFonts.manrope(fontSize: 13, color: RengeraColors.text2), maxLines: 2, overflow: TextOverflow.ellipsis),
                  onTap: onClose,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
