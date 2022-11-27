import * as vscode from 'vscode';

import * as matchers from './matchers'

export class MavenLogFoldingRangeProvider implements vscode.FoldingRangeProvider {
    onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
    
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        const ctx = new FoldingRegionContext();

        let isCurDebugOrErrorRegionLine = (lineText: string): boolean => false;

        for (let lineIdx = 0; lineIdx < document.lineCount && !token.isCancellationRequested; lineIdx++) {
            const lineText = document.lineAt(lineIdx).text;

            if (matchers.topLevelStartRegEx.test(lineText)) {
                ctx.topLevelRegion.startRegion(lineIdx);
            } else if (matchers.secondLevelStartRegEx.test(lineText)) {
                ctx.secondLevelRegion.startRegion(lineIdx);
            } else if (matchers.thirdLevelStartRegEx.test(lineText)) {
                ctx.thirdLevelRegion.startRegion(lineIdx);
            } else if (matchers.thirdLevelEndRegEx.test(lineText)) {
                ctx.thirdLevelRegion.endRegion(lineIdx-1);
            }

            if (!ctx.downloadingTopLevelRegion.inRegion()) {
                if (isDownloadingTopLevelStart(lineText)) {
                    ctx.downloadingTopLevelRegion.startRegion(lineIdx);
                    ctx.downloadingSecondLevelRegion.startFirstRegion(lineIdx+1);
                }
            } else {
                if (!isDownloadingTopLevelLine(lineText)) {
                    if (ctx.downloadingSecondLevelRegion.isInitialRegion()) {
                        ctx.downloadingSecondLevelRegion.cancelRegion();
                    }
                    ctx.downloadingTopLevelRegion.endRegion(lineIdx-1);
                } else {
                    if (isDownloadingSecondLevelStart(lineText)) {
                        ctx.downloadingSecondLevelRegion.startRegion(lineIdx);
                    } else if (!isDownloadingSecondLevelLine(lineText)) {
                        ctx.downloadingSecondLevelRegion.endRegion(lineIdx-1);
                    }
                }
            }

            if (ctx.debugOrErrorLinesRegion.inRegion() && !isCurDebugOrErrorRegionLine(lineText)) {
                ctx.debugOrErrorLinesRegion.endRegion(lineIdx-1);
            }

            if (!ctx.debugOrErrorLinesRegion.inRegion()) {
                if (isDebugSectionStart(lineText)) {
                    ctx.debugOrErrorLinesRegion.startRegion(lineIdx);
                    isCurDebugOrErrorRegionLine = isDebugSectionLine;
                } else if (isErrorSectionStart(lineText)) {
                    ctx.debugOrErrorLinesRegion.startRegion(lineIdx);
                    isCurDebugOrErrorRegionLine = isErrorLine;
                }
            }

            if (!ctx.consoleLinesRegion.inRegion() && isConsoleLine(lineText)) {
                ctx.consoleLinesRegion.startRegion(lineIdx);
            } else if (ctx.consoleLinesRegion.inRegion() && !isConsoleLine(lineText)) {
                ctx.consoleLinesRegion.endRegion(lineIdx-1);
            }

        }

        // Close all non-closed regions (top level will cascade to all regions)
        ctx.topLevelRegion.endRegion(document.lineCount-1);

        return ctx.foldingRanges;
    }
}

function isDownloadingTopLevelStart(lineText: string) {
    return matchers.downloadingLineRegEx.test(lineText);
}

function isDownloadingTopLevelLine(lineText: string) {
    return isDownloadingTopLevelStart(lineText)
        || isDownloadingSecondLevelLine(lineText);
}

function isDownloadingSecondLevelStart(lineText: string) {
    return matchers.downloadingLineRegEx.test(lineText);
}

function isDownloadingSecondLevelLine(lineText: string) {
    return matchers.downloadingProgressLineRegEx.test(lineText)
        || matchers.downloadingDebugLineRegEx.test(lineText)
        || matchers.whitespaceLineRegEx.test(lineText);
}

function isDebugSectionStart(lineText: string) {
    return matchers.debugLineStartRegEx.test(lineText);
}

function isDebugSectionLine(lineText: string) {
    return matchers.debugLineRangeRegEx.test(lineText) // Regex implicitly includes debugSectionStart lines, whitespace lines
        && !matchers.downloadingLineRegEx.test(lineText)
        && !matchers.downloadingProgressLineRegEx.test(lineText);
}

function isConsoleLine(lineText: string) {
    return matchers.consoleLineRegEx.test(lineText)
        && !matchers.downloadingLineRegEx.test(lineText)
        && !matchers.downloadingProgressLineRegEx.test(lineText)
}

function isErrorSectionStart(lineText: string) {
    return matchers.errorLineRegEx.test(lineText)
}

function isErrorLine(lineText: string) {
    return matchers.errorLineRegEx.test(lineText)
        || isConsoleLine(lineText)
}

export function activate(context: vscode.ExtensionContext, selectors: vscode.DocumentSelector[]) {
    selectors.forEach(selector => 
        context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider(
                selector, new MavenLogFoldingRangeProvider()))
    );
}



class FoldingRegionContext {

    readonly foldingRanges: vscode.FoldingRange[] = [];
    private foldingRangeAccumulator = (foldingRange: vscode.FoldingRange) => this.foldingRanges.push(foldingRange);

    // Folding Region Hierarchy ( '=>' means "contained by")

    // ThirdLevel => SecondLevel => TopLevel
    // DownloadingSecondLevel => DownloadingTopLevel => (ThirdLevel|SecondLevel|TopLevel)
    // DebugLOrErrorLines => (DownloadingSecondLevel|DownloadingTopLevel|ThirdLevel|SecondLevel|TopLevel)
    // ConsoleLines => (ErrorLines|DebugLines|DownloadingSecondLevel|DownloadingTopLevel|ThirdLevel|SecondLevel|TopLevel)

    readonly consoleLinesRegion = new MavenFoldingRegion(undefined, this.foldingRangeAccumulator);
    readonly debugOrErrorLinesRegion = new MavenFoldingRegion(this.consoleLinesRegion, this.foldingRangeAccumulator);
    readonly downloadingSecondLevelRegion = new TrackingMavenFoldingRegion(this.debugOrErrorLinesRegion, this.foldingRangeAccumulator);
    readonly downloadingTopLevelRegion = new MavenFoldingRegion(this.downloadingSecondLevelRegion, this.foldingRangeAccumulator);
    readonly thirdLevelRegion = new MavenFoldingRegion(this.downloadingTopLevelRegion, this.foldingRangeAccumulator);
    readonly secondLevelRegion = new MavenFoldingRegion(this.thirdLevelRegion, this.foldingRangeAccumulator);
    readonly topLevelRegion = new MavenFoldingRegion(this.secondLevelRegion, this.foldingRangeAccumulator);

}




class MavenFoldingRegion {
    private foldingRangeAccumulator: (foldingRegion: vscode.FoldingRange) => void;
    
    private startIdx?: number = undefined
    private innerRegionEnd: (endLineIdx: number) => void;

    constructor(innerRegion: MavenFoldingRegion | undefined, foldingRegionAccumulator: (foldingRegion: vscode.FoldingRange) => void) {
        if (innerRegion instanceof MavenFoldingRegion) {
            this.innerRegionEnd = (endLineIdx: number) => innerRegion.endRegion(endLineIdx);
        } else {
            this.innerRegionEnd = (endLineIdx: number) => {};
        }
        this.foldingRangeAccumulator = foldingRegionAccumulator;
    }

    public startRegion(startLineIdx: number) {
        this.endRegion(startLineIdx-1);
        this.startIdx = startLineIdx;
    }

    public endRegion(endLineIdx: number) {
        this.innerRegionEnd(endLineIdx);
        if (this.startIdx !== undefined && this.startIdx != endLineIdx) {
            this.foldingRangeAccumulator(new vscode.FoldingRange(this.startIdx,endLineIdx));
        }
        this.startIdx = undefined;
    }

    public inRegion(): boolean {
        return this.startIdx !== undefined;
    }

    public cancelRegion() {
        this.startIdx = undefined;
    }
}

class TrackingMavenFoldingRegion extends MavenFoldingRegion {
    private initialRegion = false;

    constructor(innerRegion: MavenFoldingRegion | undefined, foldingRegionAccumulator: (foldingRegion: vscode.FoldingRange) => void) {
        super(innerRegion,foldingRegionAccumulator);
    }

    public startFirstRegion(startLineIdx: number) {
        this.startRegion(startLineIdx);
        this.initialRegion = true;
    }

    public startRegion(startLineIdx: number) {
        super.startRegion(startLineIdx);
        this.initialRegion = false;
    }

    public isInitialRegion(): boolean {
        return this.initialRegion;
    }

}
