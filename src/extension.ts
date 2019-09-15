import * as request from "request-promise-native";

// To bring other people's ideas into your code.
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "code-prompt" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
  // The code you place here will be executed every time your command is executed

  // Display a message box to the user
  //vscode.window.showInformationMessage('Hello Worlds!');
  // Create and show a new webview
  const panel = vscode.window.createWebviewPanel(
    'catCoding', // Identifies the type of the webview. Used internally
    'Cat Coding', // Title of the panel displayed to the user
    vscode.ViewColumn.One, // Editor column to show the new webview panel in.
    {
      enableScripts: true,
      retainContextWhenHidden: true
    } // Webview options. More on these later.
    // And set its HTML content
  );
  let editors: vscode.TextEditor[] = [];

  let newLastEditor = (editorCtx: vscode.TextEditor) => {
    editors.unshift(editorCtx);
    if(editors.length > 2){
      editors.pop();
    }
  };

  let getLastEditor = () => {
    return editors[editors.length - 1];
  };

  let getLanguage = (editor: vscode.TextEditor) => {
    return "python";
  };

  let sendCode = async (code: string) => {
    const baseUrl = 'http://127.0.0.1:5000/';
    var options = {
      method: 'POST',
      uri: baseUrl,
      body: {
        code: code,
        language: getLanguage(getLastEditor()),
        results_num: 3
      },
      json: true // Automatically stringifies the body to JSON
    };

    const result = await request.get(options);
    console.log(result);
    panel.webview.postMessage({ command: 'loadCodeExamples' , codeExamples: result});
  };

  let highlightTimeout: NodeJS.Timeout;

  // consider looking at mouse up events:
  // https://code.visualstudio.com/api/references/vscode-api#TextEditorSelectionChangeKind
  vscode.window.onDidChangeTextEditorSelection(() => {
    const editor = getLastEditor();
    var selection = editor.selection;
    var text = editor.document.getText(selection);
    clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(function(){
      sendCode(text);
    }, 1000);
  });

  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.command) {
        case 'alert':
          vscode.window.showErrorMessage(message.text);
          const editor = getLastEditor(); //vscode.window.activeTextEditor;

          if(editor === undefined){
            vscode.window.showErrorMessage("Error: no editor detected");
          }
            const fullText = editor.document.getText();
            vscode.window.showErrorMessage(fullText);
            /*const fullRange = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(fullText.length - 1)
            );*/
            //vscode.window.showErrorMessage(fullRange);
          return;
        case 'searchCode':
          sendCode(message.search);
      }
    },
  );

  vscode.workspace.onDidChangeTextDocument(function(TextDocumentChangeEvent) {
    const editor = vscode.window.activeTextEditor;
    if(editor === undefined){
      console.log("rip file changed but editor is not in focus");
      return;
    }
    const position = editor.selection.active;
    let lineNum = position.line;
    let lineRange = editor.document.lineAt(lineNum).range;
    //let lineRange = new vscode.Selection(lineRange.start, lineRange.end);

    let curCode = editor.document.getText(lineRange);
    console.log(curCode);
    let startSection = curCode.trim().substring(0, 3);
    let lastSection = curCode.trim().substring(curCode.length - 3);
    if(startSection === "@RS" && lastSection ==="@RE"){
      editor.edit(edit => {
        let firstToken = curCode.indexOf("@RS");
        let deleteRange1Start = new vscode.Position(lineRange.start.line, lineRange.start.character);
        let deleteRange1End = new vscode.Position(lineRange.end.line, lineRange.end.character);
        let deleteRange1 = new vscode.Range(deleteRange1Start, deleteRange1End);
        edit.delete(deleteRange1);

        let deleteRange2Start = new vscode.Position(lineRange.start.line, lineRange.start.character);
        let deleteRange2End = new vscode.Position(lineRange.end.line, lineRange.end.character);
        let deleteRange2 = new vscode.Range(deleteRange2Start, deleteRange2End);
        edit.delete(deleteRange2);
        edit.insert(new vscode.Position(0, 0), "Your advertisement here");
      });
    }

  });

  // onDidChangeActiveTerminal
  // workspace.onDidChangeTextDocument

  var setting: vscode.Uri = vscode.Uri.parse("untitled:" + "C:\summary.txt");
vscode.workspace.openTextDocument(setting).then((a: vscode.TextDocument) => {
    vscode.window.showTextDocument(a, 1, false).then(e => {
        e.edit(edit => {
            edit.insert(new vscode.Position(0, 0), "Your advertisement here");
        });
    });
}, (error: any) => {
    console.error(error);
    debugger;
});

  /*console.log(`Did change: ${changeEvent.document.uri}`);

  for (const change of changeEvent.contentChanges) {
        console.log(change.range); // range of text being replaced
        console.log(change.text); // text replacement
  }*/

  // And get the special URI to use with the webview
  // const jquerySrc = onDiskPath.with({ scheme: 'vscode-resource' });
  // console.log(jquerySrc);

  let results: {link: string, code: string}[] = [
    {
      "link": "https://stackoverflow.com/questions/35435042/how-can-i-define-an-array-of-objects",
      "code": `let userTestStatus: { id: number, name: string }[] = [
        { "id": 0, "name": "Available" },
        { "id": 1, "name": "Ready" },
        { "id": 2, "name": "Started" }
    ];`
    },{
      "link": "https://parso.readthedocs.io/en/latest/index.html#docs",
      "code": `this is a sentence that is technically
      a line of code!`
    }
  ];

  panel.webview.html = getWebviewContent(results);
  function getWebviewContent(content: {link: string, code: string}[]) {
      return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cat Coding</title>
      </head>
      <style>
      .codeExample{
        background-color: #1a1e23;
        border-radius: 5px;
        border: 1px solid white;
        padding: 6px;
        margin: 3px;
        margin-top: 10px;
        /*white-space: pre-wrap;*/
        position: relative;
      }
      .codeExampleCon{
        /*background-color: #2c3823;
        border-radius: 10px;*/
        padding: 10px;
        margin: 10px;
        position: relative;
      }
      .codeExampleLink{
        color: white;
        height: 10px;
        margin: 10px;
        position: relative;
        text-decoration: none;
        margin-bottom: 20px;
      }
      .sexyLine{
        position: relative;
        width: 100%;
        height: 1px;
        background: black;
        background: -webkit-gradient(linear, 0 0, 100% 0, from(black), to(black), color-stop(50%, white));
        border: 0px;
        margin-top: 40px;
        margin-bottom: 40px;
      }
      textarea:focus, input:focus{
        outline: none;
      }
      #searchCode{
        position: relative;
        width: 90%;
        border: 1px solid white;
        padding: 5px;
        margin: 20px;
      }
      .highlightedLine{
        background-color: #003e8a
      }
      .fullCodeBtn{
        color: white;
        background: none;
        cursor: pointer;
        border: 1ps solid white;
        border-radius: 3px;
        font-size: 12px;
        left: 2px;
      }
      .fullCodeBackBtn{
        color: white;
        background: none;
        cursor: pointer;
        border: 1ps solid white;
        border-radius: 3px;
        font-size: 12px;
        left: 2px;
      }
      .hljs{display:block;overflow-x:auto;padding:.5em;background:#282a36;border-radius:5px;}.hljs-built_in,.hljs-link,.hljs-section,.hljs-selector-tag{color:#8be9fd}.hljs-keyword{color:#ff79c6}.hljs,.hljs-subst{color:#f8f8f2}.hljs-title{color:#50fa7b}.hljs-addition,.hljs-attr,.hljs-bullet,.hljs-meta,.hljs-name,.hljs-string,.hljs-symbol,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable{color:#f1fa8c}.hljs-comment,.hljs-deletion,.hljs-quote{color:#6272a4}.hljs-doctag,.hljs-keyword,.hljs-literal,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-strong,.hljs-title,.hljs-type{font-weight:700}.hljs-literal,.hljs-number{color:#bd93f9}.hljs-emphasis{font-style:italic}
      </style>
      <body>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.9.1/highlight.min.js"></script>
        <button id="testbtn">stuff</button>
        <div id="windowBody">
          <input id="searchCode" placeholder="Search for code"/>
          <div id="codeCon">
          </div>
        <script>
        const vscode = acquireVsCodeApi();
        let searchCode = document.getElementById("searchCode")
        searchCode.addEventListener("keyup", function(e){
          if(e.keyCode==13){
            console.log(searchCode.value)
            vscode.postMessage({
              command: 'searchCode',
              search: searchCode.value
            });
          }
        });

        document.getElementById('testbtn').onclick = function(){
          console.log("pressed");
          vscode.postMessage({
            command: 'alert',
            text: '🐛  on line '
          });
        };

        let showFullCode = (codeExampleData, codeExamples) => {
          console.log("showing the entire code")
          const Http = new XMLHttpRequest();
          const url = codeExampleData.url;
          Http.open("GET", url);
          Http.send();

          Http.onreadystatechange = (e) => {
            let codeCon = document.getElementById("codeCon");
            codeCon.innerHTML = "";

            var fullCodeBackBtn = document.createElement("button");
            fullCodeBackBtn.classList.add("fullCodeBackBtn");
            fullCodeBackBtn.innerHTML = "< Back";
            fullCodeBackBtn.onclick = function(){
              createCodeExamples(codeExamples);
            };
            codeCon.appendChild(fullCodeBackBtn);

            var codeExampleCon = document.createElement("div");
            codeExampleCon.classList.add("codeExampleCon");
            codeCon.appendChild(codeExampleCon);

            var pre = document.createElement("pre");
            pre.classList.add("codeExample");
            codeExampleCon.appendChild(pre);

            let rawcode = document.createElement("code");
            let code = Http.responseText.split("\\n");

            let lineNums = codeExampleData.lineNums;
            lineNums.forEach(function(lineNum){
              let num = parseInt(lineNum);
              code[num] = '<span class="highlightedLine">' + code[num] + '</span>';
            });

            rawcode.innerHTML = code.join("\\n");
            rawcode.classList.add("javascript");
            pre.appendChild(rawcode);

            document.querySelectorAll('pre code').forEach((block) => {
              hljs.highlightBlock(block);
            });
          }
        };


        window.addEventListener('message', event => {
          const message = event.data; // The JSON data our extension sent

          switch (message.command) {
            case 'loadCodeExamples':
              createCodeExamples(message.codeExamples);
              break;
          }
        });

        let createCodeExamples = (codeExamples) => {
          let codeCon = document.getElementById("codeCon");
          codeCon.innerHTML = "";

          for(let i = 0; i < codeExamples.length; i++){
            let codeExample = codeExamples[i];
            createCodeExample(codeExample, codeExamples);

            // Add separator line

            /*if(i < codeExamples - 1){
              var sexyLine = document.createElement("hr");
              sexyLine.classList.add("sexyLine");
              codeCon.appendChild(sexyLine);
            }*/
          }

          document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
          });
        };

        let createCodeExample = (codeExampleData, codeExamples) => {
          let codeCon = document.getElementById("codeCon");

          var codeExampleCon = document.createElement("div");
          codeExampleCon.classList.add("codeExampleCon");
          codeCon.appendChild(codeExampleCon);

          var fullCodeBtn = document.createElement("button")
          fullCodeBtn.classList.add("fullCodeBtn");
          fullCodeBtn.innerHTML = "Show Full Code >";
          fullCodeBtn.onclick = function(){
            showFullCode(codeExampleData, codeExamples);
          };
          codeExampleCon.appendChild(fullCodeBtn);

          var pre = document.createElement("pre");
          pre.classList.add("codeExample");
          codeExampleCon.appendChild(pre);

          let rawcode = document.createElement("code");
          //let minLine = Math.max(parseInt(codeExampleData.minLine) - 3, 0);
          //let maxLine = Math.min(parseInt(codeExampleData.maxLine) + 3, codeExampleData.raw.length - 1);

          let lineNums = codeExampleData.lineNums;
          let codeLines = codeExampleData.codeLines;

          /*
          lineNums.forEach(function(num){
            finalCodeLines[num] = '<span class="highlightedLine">' + finalCodeLines[num] + '</span>';
          });*/

          let finalCodeLines = [];
          let lastLine = -1;
          for(let i = 0; i < lineNums.length; i++){
            let lineNum = parseInt(lineNums[i]);
            if(lastLine != -1 && lineNum > lastLine + 1){
              finalCodeLines.push('...');
            }
            finalCodeLines.push(codeLines[i]);
            lastLine = lineNum;
          }

          //let htmlCode = finalCodeLines.slice(minLine, maxLine + 1);
          rawcode.innerHTML = finalCodeLines.join("\\n");
          rawcode.classList.add("javascript");
          pre.appendChild(rawcode);
        };

      </script>
      </body>
      </html>`;
    }
  });
        //let codeExamples = ${JSON.stringify(content)}
  //codeExample.code = codeExample.code.replace(/(?:\r\n|\r|\n)/g, '<br>');

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
