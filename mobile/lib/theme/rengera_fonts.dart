import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Wordmark font (Squada One) used for "RENGERA AI" everywhere.
class RengeraFonts {
  static TextStyle wordmark({ double size = 22, Color color = const Color(0xFFFFFFFF) }) =>
      GoogleFonts.squadaOne(
        fontSize: size,
        letterSpacing: 1.2,
        fontWeight: FontWeight.w400,
        color: color,
      );

  static TextStyle sectionLabel({ double size = 11 }) => TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w800,
        letterSpacing: 2.4,
        color: const Color(0xFFD8B485),
      );
}
