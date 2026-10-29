import * as vscode from 'vscode';

// Статистика по тексту: строки, слова, символы
function stats(text: string) {
    const words = text.match(/\S+/g)?.length ?? 0;
    const lines = text.length ? text.split(/\r?\n/).length : 0;
    return { lines, words, chars: text.length };
}

// Берём выделенный текст, а если выделения нет — весь документ
function targetText(editor: vscode.TextEditor): string {
    const sel = editor.selection;
    return sel.isEmpty ? editor.document.getText() : editor.document.getText(sel);
}

// Применяет функцию преобразования ко всем выделениям в редакторе
function transformSelections(fn: (s: string) => string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    editor.edit(edit => {
        for (const sel of editor.selections) {
            edit.replace(sel, fn(editor.document.getText(sel)));
        }
    });
}

export function activate(context: vscode.ExtensionContext) {
    // Элемент строки состояния (внизу окна)
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.command = 'text-helper.showStats';
    statusBar.tooltip = 'Text Helper: нажмите для подробной статистики';

    const updateStatusBar = () => {
        const editor = vscode.window.activeTextEditor;
        const enabled = vscode.workspace.getConfiguration('textHelper').get<boolean>('showStatusBar', true);
        if (!editor || !enabled) { statusBar.hide(); return; }
        statusBar.text = `$(pencil) Слов: ${stats(targetText(editor)).words}`;
        statusBar.show();
    };

    context.subscriptions.push(
        statusBar,

        vscode.commands.registerCommand('text-helper.showStats', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Нет открытого редактора');
                return;
            }
            const s = stats(targetText(editor));
            const where = editor.selection.isEmpty ? 'Документ' : 'Выделение';
            vscode.window.showInformationMessage(
                `${where}: строк — ${s.lines}, слов — ${s.words}, символов — ${s.chars}`
            );
        }),

        vscode.commands.registerCommand('text-helper.insertDate', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }
            const now = new Date().toLocaleString('ru-RU');
            editor.edit(edit => editor.selections.forEach(sel => edit.replace(sel, now)));
        }),

        vscode.commands.registerCommand('text-helper.upperCase', () => transformSelections(s => s.toUpperCase())),
        vscode.commands.registerCommand('text-helper.lowerCase', () => transformSelections(s => s.toLowerCase())),
        vscode.commands.registerCommand('text-helper.sortLines', () =>
            transformSelections(s => s.split(/\r?\n/).sort((a, b) => a.localeCompare(b, 'ru')).join('\n'))
        ),

        // Обновляем счётчик при смене редактора, выделения, текста или настроек
        vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
        vscode.window.onDidChangeTextEditorSelection(updateStatusBar),
        vscode.workspace.onDidChangeTextDocument(updateStatusBar),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('textHelper')) { updateStatusBar(); }
        })
    );

    updateStatusBar();
}

export function deactivate() {}
