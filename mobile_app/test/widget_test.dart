import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_app/main.dart';

void main() {
  testWidgets('Expense tracker app smoke test', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const ExpenseTrackerApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('SyncSpend'), findsOneWidget);
    expect(find.text('Sign In'), findsAtLeastNWidgets(1));
  });
}
