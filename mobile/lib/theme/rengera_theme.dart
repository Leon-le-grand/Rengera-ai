import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Rengera AI design tokens — identical to the web app so the two products
/// never drift visually. Dark is the default canvas.
class RengeraColors {
  static const canvas = Color(0xFF09090B);
  static const panel = Color(0xFF0C0C0E);
  static const panel2 = Color(0xFF141417);
  static const border = Color(0x12FFFFFF); // rgba(255,255,255,0.07)
  static const text = Color(0xFFFFFFFF);
  static const text2 = Color(0xFFD4D4D8);
  static const muted = Color(0xFFA1A1AA);
  static const faint = Color(0xFF71717A);
  static const accent = Color(0xFFD8B485);

  // Light theme
  static const canvasLight = Color(0xFFEFEEEA);
  static const panelLight = Color(0xFFF7F6F3);
  static const panel2Light = Color(0xFFE7E5E0);
  static const borderLight = Color(0x1718181B); // rgba(24,24,27,0.09)
  static const textLight = Color(0xFF18181B);
  static const text2Light = Color(0xFF3F3F46);
  static const mutedLight = Color(0xFF52525B);
  static const accentLight = Color(0xFF8A6A30);

  // Chat
  static const chatSurround = Color(0xFF0C0C0E);
  static const chatPanel = Color(0xFF131316);
  static const chatUser = Color(0xFF1D1D21);
  static const chatChip = Color(0xFF1C1C20);
  static const chatComposer = Color(0xFF161619);
  static const chatBorder = Color(0xFF2A2A2F);
  static const chatText = Color(0xFFF4F4F5);
  static const chatMuted = Color(0xFFA1A1AA);
  static const chatBlue = Color(0xFF8AB4F8);

  // Accents
  static const emerald = Color(0xFF10B981);
  static const emeraldDeep = Color(0xFF059669);
  static const gold = Color(0xFFD8B485);
  static const goldDeep = Color(0xFFB69D74);
  static const danger = Color(0xFFC5221F);
}

class RengeraTheme {
  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: RengeraColors.canvas,
      colorScheme: const ColorScheme.dark(
        primary: RengeraColors.gold,
        secondary: RengeraColors.emerald,
        surface: RengeraColors.panel,
        error: RengeraColors.danger,
        onPrimary: Color(0xFF09090B),
        onSurface: RengeraColors.text,
      ),
      textTheme: GoogleFonts.manropeTextTheme(ThemeData.dark().textTheme).apply(
        bodyColor: RengeraColors.text2,
        displayColor: RengeraColors.text,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: RengeraColors.canvas,
        foregroundColor: RengeraColors.text,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: RengeraColors.panel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(3)),
          side: const BorderSide(color: RengeraColors.border, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: RengeraColors.panel2,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(3),
          borderSide: const BorderSide(color: RengeraColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(3),
          borderSide: const BorderSide(color: RengeraColors.gold, width: 1.5),
        ),
        hintStyle: const TextStyle(color: RengeraColors.faint),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: RengeraColors.gold,
          foregroundColor: const Color(0xFF09090B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
          textStyle: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        ),
      ),
      dividerColor: RengeraColors.border,
      iconTheme: const IconThemeData(color: RengeraColors.muted, size: 20),
    );
  }

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: RengeraColors.canvasLight,
      colorScheme: const ColorScheme.light(
        primary: RengeraColors.accentLight,
        secondary: RengeraColors.emeraldDeep,
        surface: RengeraColors.panelLight,
        error: RengeraColors.danger,
        onPrimary: Colors.white,
        onSurface: RengeraColors.textLight,
      ),
      textTheme: GoogleFonts.manropeTextTheme(ThemeData.light().textTheme).apply(
        bodyColor: RengeraColors.text2Light,
        displayColor: RengeraColors.textLight,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: RengeraColors.canvasLight,
        foregroundColor: RengeraColors.textLight,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: RengeraColors.panelLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(3)),
          side: BorderSide(color: RengeraColors.borderLight, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: RengeraColors.panel2Light,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(3),
          borderSide: BorderSide(color: RengeraColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(3),
          borderSide: const BorderSide(color: RengeraColors.accentLight, width: 1.5),
        ),
        hintStyle: const TextStyle(color: RengeraColors.mutedLight),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: RengeraColors.accentLight,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
          textStyle: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        ),
      ),
      dividerColor: RengeraColors.borderLight,
      iconTheme: const IconThemeData(color: RengeraColors.mutedLight, size: 20),
    );
  }
}
