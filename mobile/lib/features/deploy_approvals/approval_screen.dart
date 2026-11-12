import 'package:flutter/material.dart';

class DeployApprovalScreen extends StatelessWidget {
  const DeployApprovalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Rengera Deploy Mesh: awaiting SPIFFE control-plane handshake'),
      ),
    );
  }
}
