import 'package:flutter/material.dart';

class VmLogsScreen extends StatelessWidget {
  final String runId;

  const VmLogsScreen({super.key, required this.runId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('MicroVM Logs · $runId')),
      body: const Center(
        child: Text('Streaming stdout/stderr from Firecracker snapshot pool...'),
      ),
    );
  }
}
