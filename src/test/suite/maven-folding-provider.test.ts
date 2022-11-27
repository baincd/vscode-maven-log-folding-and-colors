import {Assertion, expect} from 'chai'
import * as chai from 'chai'
import { fail } from 'assert';

import * as vscode from 'vscode';

import * as foldingProvider from '../../foldingProvider';


declare global {
    export namespace Chai {
        interface Assertion {
			foldingRanges(expectedRanges: number[][]): Promise<void>;
			containFoldingRange(expectedRange: number[]): Promise<void>;
			notContainFoldingRange(unexpectedRange: number[]): Promise<void>;
        }
    }
}

chai.use(function(chai, util) {
    chai.Assertion.addMethod("foldingRanges", function (expectedRanges: number[][]) {
		const actualRanges = this._obj as vscode.FoldingRange[];
		expect(actualRanges).to.have.lengthOf(expectedRanges.length);
		expectedRanges.forEach((expected, i) => {
			expectWithinActualRanges(expected, actualRanges);
		});
    });
    chai.Assertion.addMethod("containFoldingRange", function (expectedRange: number[]) {
		const actualRanges = this._obj as vscode.FoldingRange[];
		expectWithinActualRanges(expectedRange, actualRanges);
    });
    chai.Assertion.addMethod("notContainFoldingRange", function (expectedRange: number[]) {
		const actualRanges = this._obj as vscode.FoldingRange[];
		if (expectedFoundWithinActualRanges(expectedRange, actualRanges)) {
			fail("Expected to not find folding range \n   [" + expectedRange + "]\n     but was found in\n   " + "[" + actualRanges.map(r => "[" + r.start + "," + r.end + "]").join(",\n   ") + "]" );
		}
    });


	function expectWithinActualRanges(expectedRange: number[], actualRanges: vscode.FoldingRange[]) {
		if (!expectedFoundWithinActualRanges(expectedRange, actualRanges)) {
			fail("Expected folding range \n   [" + expectedRange + "]\n     but was not found in\n   " + "[" + actualRanges.map(r => "[" + r.start + "," + r.end + "]").join(",\n   ") + "]" );
		}
	}
	function expectedFoundWithinActualRanges(expectedRange: number[], actualRanges: vscode.FoldingRange[]): boolean {
		for (const actual of actualRanges) {
			if (actual.start === expectedRange[0] && actual.end === expectedRange[1]) {
				return true;
			}
		}
		return false;
	};
});

describe('Maven Folding Provider', () => {
	vscode.window.showInformationMessage('Running Maven Folding Provider tests');

	afterEach('Close all editors',async () => {
		await vscode.commands.executeCommand("workbench.action.closeAllEditors");
	});

	specify('Extension Loaded', () => {
		const started = vscode.extensions.getExtension(
			"baincd.maven-log-folding-and-colors",
		)?.isActive;

		expect(started).to.not.be.undefined;
	});

	it('should return no regions on empty document', async () => {
		let document = await openDocument([]);

		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.lengthOf(0);
	});

	it('should return Reactor Build Order as a top level region ending before the app', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] Scanning for projects...",
			/* 1:*/ "[INFO] ------------------------------------------------------------------------",
			/* 2:*/ "[INFO] Reactor Build Order:",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] Example Parent                                                     [pom]",
			/* 5:*/ "[INFO] Example Library                                                    [jar]",
			/* 6:*/ "[INFO] Example App                                                        [jar]",
			/* 7:*/ "[INFO] ",
			/* 8:*/ "[INFO] ---------------------< com.example:example-parent >---------------------"
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.containFoldingRange([2,7]);
	});

	it('should return Reactor Build Order as a top level region even when no other top level regions', async () => {
		let document = await openDocument([
		/* 0:*/ "[INFO] Scanning for projects...",
		/* 1:*/ "[INFO] ------------------------------------------------------------------------",
		/* 2:*/ "[INFO] Reactor Build Order:",
		/* 3:*/ "[INFO] ",
		/* 4:*/ "[INFO] Example Parent                                                     [pom]",
		/* 5:*/ "[INFO] Example Library                                                    [jar]",
		/* 6:*/ "[INFO] Example App                                                        [jar]",
		/* 7:*/ "[INFO] ",
		]);
		
		let actual = classUnderTestFoldingRanges(document);
		
		expect(actual).to.containFoldingRange([2,7]);
	});

	it('should return Reactor Build Order and module as folding regions', async () => {
		let document = await openDocument([
		/* 0:*/ "[INFO] Scanning for projects...",
		/* 1:*/ "[INFO] ------------------------------------------------------------------------",
		/* 2:*/ "[INFO] Reactor Build Order:",
		/* 3:*/ "[INFO] ",
		/* 4:*/ "[INFO] Example Parent                                                     [pom]",
		/* 5:*/ "[INFO] Example Library                                                    [jar]",
		/* 6:*/ "[INFO] Example App                                                        [jar]",
		/* 7:*/ "[INFO] ",
		/* 8:*/ "[INFO] ---------------------< com.example:example-parent >---------------------",
		/* 9:*/ "[INFO] Building Example Parent 0.0.1-SNAPSHOT                             [1/3]",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[2,7],[8,9]]);
	});

	it('should identify a really long app name as a top level region', async () => {
		let document = await openDocument([
		/* 0:*/ "[INFO] --< com.example:example-app-this-is-a-really-really-really-really-long-app-name >--",
		/* 1:*/ "[INFO] Building Example App 0.0.1-SNAPSHOT                                [3/3]"			
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[0,1]]);
	});
	
	it('should include Reactor Summary as a top level region', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] Scanning for projects...",
			/* 1:*/ "[INFO] ------------------------------------------------------------------------",
			/* 2:*/ "[INFO] Reactor Build Order:",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] Example Parent                                                     [pom]",
			/* 5:*/ "[INFO] Example Library                                                    [jar]",
			/* 6:*/ "[INFO] ",
			/* 7:*/ "[INFO] ---------------------< com.example:example-parent >---------------------",
			/* 8:*/ "[INFO] Building Example Parent 0.0.1-SNAPSHOT                             [1/3]",
			/* 9:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/*10:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/*11:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/*12:*/ "[INFO] ",
			/*13:*/ "[INFO] ------------------------------------------------------------------------",
			/*14:*/ "[INFO] Reactor Summary for Example Parent 0.0.1-SNAPSHOT:",
			/*15:*/ "[INFO] ",
			/*16:*/ "[INFO] Example Parent ..................................... SUCCESS [  0.147 s]",
			/*17:*/ "[INFO] Example Library .................................... SUCCESS [  3.993 s]",
			/*18:*/ "[INFO] ------------------------------------------------------------------------",
			
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[2,6],[7,8],[9,13],[14,18]]);
	});
		
	it('should include Build Success as a top level region', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ------------------------------------------------------------------------",
			/* 1:*/ "[INFO] Reactor Summary for Example Parent 0.0.1-SNAPSHOT:",
			/* 2:*/ "[INFO] ",
			/* 3:*/ "[INFO] Example Parent ..................................... SUCCESS [  0.147 s]",
			/* 4:*/ "[INFO] Example Library .................................... SUCCESS [  3.993 s]",
			/* 5:*/ "[INFO] Example App ........................................ SUCCESS [  5.849 s]",
			/* 6:*/ "[INFO] ------------------------------------------------------------------------",
			/* 7:*/ "[INFO] BUILD SUCCESS",
			/* 8:*/ "[INFO] ------------------------------------------------------------------------",
			/* 9:*/ "[INFO] Total time:  10.340 s",
			/*10:*/ "[INFO] Finished at: 2022-03-27T11:38:16-04:00",
			/*11:*/ "[INFO] ------------------------------------------------------------------------",
					
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[1,6],[7,11]]);
	});

	it('should include Build Failure as a top level region', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ------------------------------------------------------------------------",
			/* 1:*/ "[INFO] Reactor Summary for Example Parent 0.0.1-SNAPSHOT:",
			/* 2:*/ "[INFO] ",
			/* 3:*/ "[INFO] Example Parent ..................................... SUCCESS [  0.147 s]",
			/* 4:*/ "[INFO] Example Library .................................... SUCCESS [  3.993 s]",
			/* 5:*/ "[INFO] Example App ........................................ SUCCESS [  5.849 s]",
			/* 6:*/ "[INFO] ------------------------------------------------------------------------",
			/* 7:*/ "[INFO] BUILD FAILURE",
			/* 8:*/ "[INFO] ------------------------------------------------------------------------",
			/* 9:*/ "[INFO] Total time:  10.340 s",
			/*10:*/ "[INFO] Finished at: 2022-03-27T11:38:16-04:00",
			/*11:*/ "[INFO] ------------------------------------------------------------------------",
					
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[1,6],[7,11]]);
	});

	it('should include build plugin as second level regions', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ",
			/* 1:*/ "[INFO] ---------------------< com.example:example-parent >---------------------",
			/* 2:*/ "[INFO] Building Example Parent 0.0.1-SNAPSHOT                             [1/3]",
			/* 3:*/ "[INFO] --------------------------------[ pom ]---------------------------------",
			/* 4:*/ "[INFO] ",
			/* 5:*/ "[INFO] --- maven-clean-plugin:3.1.0:clean (default-clean) @ example-parent ---",
			/* 6:*/ "[INFO] ",
			/* 7:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 8:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 9:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/*10:*/ "[INFO] ",
			/*11:*/ "[INFO] --- maven-clean-plugin:3.1.0:clean (default-clean) @ example-lib ---",
			/*12:*/ "[INFO] Deleting /my-projects/example-spring-app/example-lib/target",
			/*13:*/ "[INFO] ",
			/*14:*/ "[INFO] --- maven-resources-plugin:3.2.0:resources (default-resources) @ example-lib ---",
			/*15:*/ "[INFO] Using 'UTF-8' encoding to copy filtered resources.",
			/*16:*/ "[INFO] Using 'UTF-8' encoding to copy filtered properties files.",
			/*17:*/ "[INFO] Copying 1 resource",
			/*18:*/ "[INFO] Copying 0 resource",
			/*19:*/ "[INFO] 			",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([5,6])
		expect(actual).to.be.containFoldingRange([11,13]);
		expect(actual).to.be.containFoldingRange([14,19]);
	});

	it('should include test running as start of 3rd level region', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 1:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ example-lib ---",
			/* 5:*/ "[INFO] ",
			/* 6:*/ "[INFO] -------------------------------------------------------",
			/* 7:*/ "[INFO]  T E S T S",
			/* 8:*/ "[INFO] -------------------------------------------------------",
			/* 9:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*10:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]"
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([9,10]);
	});

	it('should consider test running as end of previous 3rd level region', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 1:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ example-lib ---",
			/* 5:*/ "[INFO] ",
			/* 6:*/ "[INFO] -------------------------------------------------------",
			/* 7:*/ "[INFO]  T E S T S",
			/* 8:*/ "[INFO] -------------------------------------------------------",
			/* 9:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*10:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]",
			/*11:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*12:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]"
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([9,10]);
	});

	it('should consider test results as end of previous 3rd level region', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 1:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ example-lib ---",
			/* 5:*/ "[INFO] ",
			/* 6:*/ "[INFO] -------------------------------------------------------",
			/* 7:*/ "[INFO]  T E S T S",
			/* 8:*/ "[INFO] -------------------------------------------------------",
			/* 9:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*10:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]",
			/*11:*/ "[INFO] Results:",
			/*12:*/ "[INFO] ",
			/*13:*/ "[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([9,10]);
	});

	it('should end existing third level when second level starts', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 1:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ example-lib ---",
			/* 5:*/ "[INFO] ",
			/* 6:*/ "[INFO] -------------------------------------------------------",
			/* 7:*/ "[INFO]  T E S T S",
			/* 8:*/ "[INFO] -------------------------------------------------------",
			/* 9:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*10:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]",
			/*11:*/ "[INFO] --- maven-clean-plugin:3.1.0:clean (default-clean) @ example-app-this-is-a-really-really-really-really-really-really-really-really-really-long-app-name ---",
			/*12:*/ "[INFO] Deleting /my-projects/example-spring-app/example-app/target",
			
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([9,10]);
	});

	it('should end existing third level when first level starts', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 1:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ example-lib ---",
			/* 5:*/ "[INFO] ",
			/* 6:*/ "[INFO] ",
			/* 7:*/ "[INFO] -------------------------------------------------------",
			/* 8:*/ "[INFO]  T E S T S",
			/* 9:*/ "[INFO] -------------------------------------------------------",
			/*10:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*12:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]",
			/*13:*/ "[INFO] ----------------------< com.example:example-lib2 >----------------------",
			/*14:*/ "[INFO] Building Example Library2 0.0.1-SNAPSHOT                           [2/3]",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([10,11]);
	});

	it('should end existing second level when first level starts', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 1:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ example-lib ---",
			/* 5:*/ "[INFO] ",
			/* 6:*/ "[INFO] -------------------------------------------------------",
			/* 7:*/ "[INFO]  T E S T S",
			/* 8:*/ "[INFO] -------------------------------------------------------",
			/* 9:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*10:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]",
			/*11:*/ "[INFO] ----------------------< com.example:example-lib2 >----------------------",
			/*12:*/ "[INFO] Building Example Library2 0.0.1-SNAPSHOT                           [2/3]",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([4,10]);
	});

	it('should create folding region for downloading lines outside top level section', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] Scanning for projects...",
			/* 1:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-parent/2.4.3/spring-boot-starter-parent-2.4.3.pom",
			/* 2:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-parent/2.4.3/spring-boot-starter-parent-2.4.3.pom (8.6 kB at 21 kB/s)",
			/* 3:*/ "[INFO] ------------------------------------------------------------------------",
			/* 4:*/ "[INFO] Reactor Build Order:",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[1,2]]);
	});

	it('should create folding region for downloading lines inside top level section', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ------------------------< com.example:library >-------------------------",
			/* 1:*/ "[INFO] Building multi-module-library 0.0.1-SNAPSHOT                       [1/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ library ---",
			/* 4:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom",
			/* 5:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom (11 kB at 327 kB/s)",
			/* 6:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom",
			/* 7:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom (1.6 kB at 49 kB/s)",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([4,7]);
	});

	it('should create folding region for downloading lines inside top level section', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ------------------------< com.example:library >-------------------------",
			/* 1:*/ "[INFO] Building multi-module-library 0.0.1-SNAPSHOT                       [1/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ library ---",
			/* 4:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom",
			/* 5:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom (11 kB at 327 kB/s)",
			/* 6:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom",
			/* 7:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom (1.6 kB at 49 kB/s)",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([4,7]);
	});

	it('should create folding region for each downloading line', async () => {
		let document = await openDocument([
			/* 0:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom",
			/* 1:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom (11 kB at 327 kB/s)",
			/* 2:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom",
			/* 3:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom (1.6 kB at 49 kB/s)",
			/* 4:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/shared/file-management/3.0.0/file-management-3.0.0.pom",
			/* 5:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/shared/file-management/3.0.0/file-management-3.0.0.pom (4.7 kB at 120 kB/s)",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([2,3]);
	});

	it('should include non-match Progress lines in inner downloading region', async () => {
		let document = await openDocument([
			/* 0:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom",
			/* 1:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom (11 kB at 327 kB/s)",
			/* 2:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom",
			/* 3:*/ "Progress (1): 4.1/283 kB",
			/* 4:*/ "Progress (2): 212/283 kB | 1.4/696 kB",
			/* 5:*/ "Progress (3): 241/283 kB | 6.9/696 kB | 0/1.2 MB",
			/* 6:*/ "Progress (4): 241/283 kB | 6.9/696 kB | 0/1.2 MB | 0/1.3 MB",
			/* 7:*/ "Progress (5): 283 kB | 34/696 kB | 0/1.2 MB | 0/1.3 MB | 1.4/374 kB",
			/* 8:*/ "Progress (5): 283 kB | 57/696 kB | 0.1/1.2 MB | 0.1/1.3 MB | 28/374 kB",
			/* 9:*/ "																				  ",
			/*10:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom (1.6 kB at 49 kB/s)",
			/*11:*/ "[WARNING] Could not transfer metadata org.example:example-maven-plugin/maven-metadata.xml from/to blah blah blah",
			/*12:*/ "Progress (1): 4.1/283 kB",
			/*13:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/shared/file-management/3.0.0/file-management-3.0.0.pom",
			/*14:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/shared/file-management/3.0.0/file-management-3.0.0.pom (4.7 kB at 120 kB/s)",
			
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([2,10]);
		expect(actual).to.be.containFoldingRange([11,12]);
		expect(actual).to.be.containFoldingRange([13,14]);
	});

	it('should end all downloading sections with start of new top level section', async () => {
		let document = await openDocument([
			/* 0:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom",
			/* 1:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/surefire/maven-surefire-common/2.22.2/maven-surefire-common-2.22.2.pom (11 kB at 327 kB/s)",
			/* 2:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom",
			/* 3:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugin-tools/maven-plugin-annotations/3.5.2/maven-plugin-annotations-3.5.2.pom (1.6 kB at 49 kB/s)",
			/* 4:*/ "[INFO] Reactor Build Order:",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([0,3]);
		expect(actual).to.be.containFoldingRange([2,3]);
	});

	it('should fold debug sections', async () => {
		let document = await openDocument([
			/* 0:*/ "[DEBUG] Created new class realm maven.api",
			/* 1:*/ "[DEBUG] Importing foreign packages into class realm maven.api",
			/* 2:*/ "[INFO] ------------------------< com.example:library >-------------------------",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([0,1]);
	});

	it('should fold debug sections within top level section', async () => {
		let document = await openDocument([
			/* 0*/ "[INFO] ",
			/* 1*/ "[INFO] ------------------------< com.example:library >-------------------------",
			/* 2*/ "[INFO] Building multi-module-library 0.0.1-SNAPSHOT                       [1/3]",
			/* 3*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 4*/ "[DEBUG] Lifecycle default -> [validate, initialize, generate-sources, process-sources, generate-resources, process-resources, compile, process-classes, generate-test-sources, process-test-sources, generate-test-resources, process-test-resources, test-compile, process-test-classes, test, prepare-package, package, pre-integration-test, integration-test, post-integration-test, verify, install, deploy]",
			/* 5*/ "[DEBUG] Lifecycle clean -> [pre-clean, clean, post-clean]",
			/* 6*/ "[DEBUG] Lifecycle site -> [pre-site, site, post-site, site-deploy]",
			/* 7*/ "[DEBUG] Lifecycle default -> [validate, initialize, generate-sources, process-sources, generate-resources, process-resources, compile, process-classes, generate-test-sources, process-test-sources, generate-test-resources, process-test-resources, test-compile, process-test-classes, test, prepare-package, package, pre-integration-test, integration-test, post-integration-test, verify, install, deploy]",
			/* 8*/ "[DEBUG] Lifecycle clean -> [pre-clean, clean, post-clean]",
			/* 9*/ "[DEBUG] Lifecycle site -> [pre-site, site, post-site, site-deploy]",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([4,9]);
	});

	it('should fold debug sections within downloading section', async () => {
		let document = await openDocument([
			/* 0*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-parent/2.4.3/spring-boot-starter-parent-2.4.3.pom",
			/* 1*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-parent/2.4.3/spring-boot-starter-parent-2.4.3.pom (8.6 kB at 9.8 kB/s)",
			/* 2*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/springframework/boot/spring-boot-starter-parent/2.4.3/_remote.repositories",
			/* 3*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/springframework/boot/spring-boot-starter-parent/2.4.3/spring-boot-starter-parent-2.4.3.pom.lastUpdated",
			/* 4*/ "[DEBUG] Resolving artifact org.springframework.boot:spring-boot-dependencies:pom:2.4.3 from [central (https://repo.maven.apache.org/maven2, default, releases)]",
			/* 5*/ "[DEBUG] Using transporter WagonTransporter with priority -1.0 for https://repo.maven.apache.org/maven2",
			/* 6*/ "[DEBUG] Using connector BasicRepositoryConnector with priority 0.0 for https://repo.maven.apache.org/maven2",
			/* 7*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-dependencies/2.4.3/spring-boot-dependencies-2.4.3.pom",
			/* 8*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-dependencies/2.4.3/spring-boot-dependencies-2.4.3.pom (108 kB at 127 kB/s)",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([2,6]);
	});

	it('should include lines that do not start with log level in debug folding sections', async () => {
		let document = await openDocument([
			/* 0:*/ "[DEBUG] -----------------------------------------------------------------------",
			/* 1:*/ "[DEBUG] Goal:          org.apache.maven.plugins:maven-clean-plugin:3.2.0:clean (default-clean)",
			/* 2:*/ "[DEBUG] Style:         Regular",
			/* 3:*/ "[DEBUG] Configuration: <?xml version=\"1.0\" encoding=\"UTF-8\"?>",
			/* 4:*/ "<configuration>",
			/* 5:*/ "  <directory default-value=\"${project.build.directory}\"/>",
			/* 6:*/ "  <excludeDefaultDirectories default-value=\"false\">${maven.clean.excludeDefaultDirectories}</excludeDefaultDirectories>",
			/* 7:*/ "  <failOnError default-value=\"true\">${maven.clean.failOnError}</failOnError>",
			/* 8:*/ "  <fast default-value=\"false\">${maven.clean.fast}</fast>",
			/* 9:*/ "  <fastDir>${maven.clean.fastDir}</fastDir>",
			/*10:*/ "  <fastMode default-value=\"background\">${maven.clean.fastMode}</fastMode>",
			/*11:*/ "  <followSymLinks default-value=\"false\">${maven.clean.followSymLinks}</followSymLinks>",
			/*12:*/ "  <outputDirectory default-value=\"${project.build.outputDirectory}\"/>",
			/*13:*/ "  <reportDirectory default-value=\"${project.build.outputDirectory}\"/>",
			/*14:*/ "  <retryOnError default-value=\"true\">${maven.clean.retryOnError}</retryOnError>",
			/*15:*/ "  <session default-value=\"${session}\"/>",
			/*16:*/ "  <skip default-value=\"false\">${maven.clean.skip}</skip>",
			/*17:*/ "  <testOutputDirectory default-value=\"${project.build.testOutputDirectory}\"/>",
			/*18:*/ "  <verbose>${maven.clean.verbose}</verbose>",
			/*19:*/ "</configuration>",
			/*20:*/ "[DEBUG] =======================================================================",
			/*21:*/ "[INFO] Deleting /home/chris/dev/wc/example-maven-multi-module/library/target",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([0,20]);
	});

	it('should fold error lines', async () => {
		let document = await openDocument([
			/* 0:*/ "[ERROR] Failed to execute goal on project example-app-this-is-a-really-really-really-really-really-really-really-really-really-long-app-name: Could not resolve dependencies for project com.example:example-app-this-is-a-really-really-really-really-really-really-really-really-really-long-app-name:jar:0.0.1-SNAPSHOT: Failure to find com.example:barf:jar:1.0.0 in https://repo.maven.apache.org/maven2 was cached in the local repository, resolution will not be reattempted until the update interval of central has elapsed or updates are forced -> [Help 1]",
			/* 1:*/ "[ERROR] ",
			/* 2:*/ "[ERROR] To see the full stack trace of the errors, re-run Maven with the -e switch.",
			/* 3:*/ "[ERROR] Re-run Maven using the -X switch to enable full debug logging.						",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([0,3]);
	});

	it('should fold debug and error lines as separate regions', async () => {
		let document = await openDocument([
			/* 0:*/ "[DEBUG] Debug Line ...",
			/* 1:*/ "[DEBUG] ",
			/* 2:*/ "[ERROR] Error Line ...",
			/* 3:*/ "[ERROR] ",
			/* 4:*/ "[DEBUG] Debug Line ...",
			/* 5:*/ "[DEBUG] ",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[0,1],[2,3],[4,5]]);
	});

	it('should include lines that do not start with log level in error folding sections', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ---",
			/* 1:*/ "[ERROR] Failed to execute goal on project library: Could not resolve dependencies for project com.example:library:jar:0.0.1-SNAPSHOT: org.test.uhoh:barf:jar:1.0.0 was not found in https://repo.maven.apache.org/maven2 during a previous attempt. This failure was cached in the local repository and resolution is not reattempted until the update interval of central has elapsed or updates are forced -> [Help 1]",
			/* 2:*/ "org.apache.maven.lifecycle.LifecycleExecutionException: Failed to execute goal on project library: Could not resolve dependencies for project com.example:library:jar:0.0.1-SNAPSHOT: org.test.uhoh:barf:jar:1.0.0 was not found in https://repo.maven.apache.org/maven2 during a previous attempt. This failure was cached in the local repository and resolution is not reattempted until the update interval of central has elapsed or updates are forced",
			/* 3:*/ "	at org.apache.maven.lifecycle.internal.LifecycleDependencyResolver.getDependencies (LifecycleDependencyResolver.java:269)",
			/* 4:*/ "Caused by: org.apache.maven.project.DependencyResolutionException: Could not resolve dependencies for project com.example:library:jar:0.0.1-SNAPSHOT: org.test.uhoh:barf:jar:1.0.0 was not found in https://repo.maven.apache.org/maven2 during a previous attempt. This failure was cached in the local repository and resolution is not reattempted until the update interval of central has elapsed or updates are forced",
			/* 5:*/ "	at org.apache.maven.project.DefaultProjectDependenciesResolver.resolve (DefaultProjectDependenciesResolver.java:214)",
			/* 6:*/ "[ERROR] ",
			/* 7:*/ "[ERROR] ",
			/* 8:*/ "[ERROR] For more information about the errors and possible solutions, please read the following articles:",
			/* 9:*/ "[ERROR] [Help 1] http://cwiki.apache.org/confluence/display/MAVEN/DependencyResolutionException",
			/*10:*/ "[INFO] ---",
			
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([1,9]);
	});

	it('should fold console lines (lines that do not start with log level) within debug folding sections', async () => {
		let document = await openDocument([
			/* 0:*/ "[DEBUG] -----------------------------------------------------------------------",
			/* 1:*/ "[DEBUG] Goal:          org.apache.maven.plugins:maven-clean-plugin:3.2.0:clean (default-clean)",
			/* 2:*/ "[DEBUG] Style:         Regular",
			/* 3:*/ "[DEBUG] Configuration: <?xml version=\"1.0\" encoding=\"UTF-8\"?>",
			/* 4:*/ "<configuration>",
			/* 5:*/ "  <directory default-value=\"${project.build.directory}\"/>",
			/* 6:*/ "  <excludeDefaultDirectories default-value=\"false\">${maven.clean.excludeDefaultDirectories}</excludeDefaultDirectories>",
			/* 7:*/ "  <failOnError default-value=\"true\">${maven.clean.failOnError}</failOnError>",
			/* 8:*/ "  <fast default-value=\"false\">${maven.clean.fast}</fast>",
			/* 9:*/ "  <fastDir>${maven.clean.fastDir}</fastDir>",
			/*10:*/ "  <fastMode default-value=\"background\">${maven.clean.fastMode}</fastMode>",
			/*11:*/ "  <followSymLinks default-value=\"false\">${maven.clean.followSymLinks}</followSymLinks>",
			/*12:*/ "  <outputDirectory default-value=\"${project.build.outputDirectory}\"/>",
			/*13:*/ "  <reportDirectory default-value=\"${project.build.outputDirectory}\"/>",
			/*14:*/ "  <retryOnError default-value=\"true\">${maven.clean.retryOnError}</retryOnError>",
			/*15:*/ "  <session default-value=\"${session}\"/>",
			/*16:*/ "  <skip default-value=\"false\">${maven.clean.skip}</skip>",
			/*17:*/ "  <testOutputDirectory default-value=\"${project.build.testOutputDirectory}\"/>",
			/*18:*/ "  <verbose>${maven.clean.verbose}</verbose>",
			/*19:*/ "</configuration>",
			/*20:*/ "[DEBUG] =======================================================================",
			/*21:*/ "[INFO] Deleting /home/chris/dev/wc/example-maven-multi-module/library/target",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([4,19]);
	});

	it('should fold console lines (lines that do not start with log level) within test execution sections', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ----------------------< com.example:example-lib >-----------------------",
			/* 1:*/ "[INFO] Building Example Library 0.0.1-SNAPSHOT                            [2/3]",
			/* 2:*/ "[INFO] --------------------------------[ jar ]---------------------------------",
			/* 3:*/ "[INFO] ",
			/* 4:*/ "[INFO] --- maven-surefire-plugin:2.22.2:test (default-test) @ example-lib ---",
			/* 5:*/ "[INFO] ",
			/* 6:*/ "[INFO] -------------------------------------------------------",
			/* 7:*/ "[INFO]  T E S T S",
			/* 8:*/ "[INFO] -------------------------------------------------------",
			/* 9:*/ "[INFO] Running com.example.examplelib.ExampleLibraryApplicationTests",
			/*10:*/ "11:38:08.397 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]",
			/*11:*/ "println example"
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([10,11]);
	});

	it('should fold console lines (lines that do not start with log level) within error folding sections', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ---",
			/* 1:*/ "[ERROR] Failed to execute goal on project library: Could not resolve dependencies for project com.example:library:jar:0.0.1-SNAPSHOT: org.test.uhoh:barf:jar:1.0.0 was not found in https://repo.maven.apache.org/maven2 during a previous attempt. This failure was cached in the local repository and resolution is not reattempted until the update interval of central has elapsed or updates are forced -> [Help 1]",
			/* 2:*/ "org.apache.maven.lifecycle.LifecycleExecutionException: Failed to execute goal on project library: Could not resolve dependencies for project com.example:library:jar:0.0.1-SNAPSHOT: org.test.uhoh:barf:jar:1.0.0 was not found in https://repo.maven.apache.org/maven2 during a previous attempt. This failure was cached in the local repository and resolution is not reattempted until the update interval of central has elapsed or updates are forced",
			/* 3:*/ "	at org.apache.maven.lifecycle.internal.LifecycleDependencyResolver.getDependencies (LifecycleDependencyResolver.java:269)",
			/* 4:*/ "Caused by: org.apache.maven.project.DependencyResolutionException: Could not resolve dependencies for project com.example:library:jar:0.0.1-SNAPSHOT: org.test.uhoh:barf:jar:1.0.0 was not found in https://repo.maven.apache.org/maven2 during a previous attempt. This failure was cached in the local repository and resolution is not reattempted until the update interval of central has elapsed or updates are forced",
			/* 5:*/ "	at org.apache.maven.project.DefaultProjectDependenciesResolver.resolve (DefaultProjectDependenciesResolver.java:214)",
			/* 6:*/ "[ERROR] ",
			/* 7:*/ "[ERROR] ",
			/* 8:*/ "[ERROR] For more information about the errors and possible solutions, please read the following articles:",
			/* 9:*/ "[ERROR] [Help 1] http://cwiki.apache.org/confluence/display/MAVEN/DependencyResolutionException",
			/*10:*/ "[INFO] ---",
			
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([2,5]);
	});

	it('should fold debug lines with indentation', async () => {
		let document = await openDocument([
			/* 0*/ "[DEBUG] Importing foreign packages into class realm maven.api",
			/* 1*/ "[DEBUG]   Imported: javax.annotation.* < plexus.core",
			/* 2*/ "[DEBUG]   Imported: javax.annotation.security.* < plexus.core",
			/* 3*/ "[DEBUG]   Imported: javax.inject.* < plexus.core",
			/* 4*/ "[DEBUG] Populating class realm maven.api",
			/* 5*/ "[INFO] ",
						
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([1,3]);
	});

	it('should include certain debug lines in second level of downloading folding section', async () => {
		let document = await openDocument([
			/* 0:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-maven-plugin/2.4.3/spring-boot-maven-plugin-2.4.3.pom",
			/* 1:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-maven-plugin/2.4.3/spring-boot-maven-plugin-2.4.3.pom (2.9 kB at 44 kB/s)",
			/* 2:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-maven-plugin/2.4.3/spring-boot-maven-plugin-2.4.3.jar",
			/* 3:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-maven-plugin/2.4.3/spring-boot-maven-plugin-2.4.3.jar (101 kB at 1.7 MB/s)",
			/* 4:*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/springframework/boot/spring-boot-maven-plugin/2.4.3/_remote.repositories",
			/* 5:*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/springframework/boot/spring-boot-maven-plugin/2.4.3/spring-boot-maven-plugin-2.4.3.jar.lastUpdated",
			/* 6:*/ "[DEBUG] Using transporter WagonTransporter with priority -1.0 for https://repo.maven.apache.org/maven2",
			/* 7:*/ "[DEBUG] Using connector BasicRepositoryConnector with priority 0.0 for https://repo.maven.apache.org/maven2",
			/* 8:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-clean-plugin/3.1.0/maven-clean-plugin-3.1.0.pom",
			/* 9:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-clean-plugin/3.1.0/maven-clean-plugin-3.1.0.pom (5.2 kB at 144 kB/s)",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([2,7]);
	});

	it('should fold downloading-specific debug lines separate from non-downloading-specific debug lines', async () => {
		let document = await openDocument([
			/* 0:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-jar-plugin/3.2.0/maven-jar-plugin-3.2.0.pom",
			/* 1:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-jar-plugin/3.2.0/maven-jar-plugin-3.2.0.pom (7.3 kB at 169 kB/s)",
			/* 2:*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/apache/maven/plugins/maven-jar-plugin/3.2.0/_remote.repositories",
			/* 3:*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/apache/maven/plugins/maven-jar-plugin/3.2.0/maven-jar-plugin-3.2.0.pom.lastUpdated",
			/* 4:*/ "[DEBUG] Resolving artifact org.apache.maven.plugins:maven-jar-plugin:jar:3.2.0 from [central (https://repo.maven.apache.org/maven2, default, releases)]",
			/* 5:*/ "[DEBUG] Using transporter WagonTransporter with priority -1.0 for https://repo.maven.apache.org/maven2",
			/* 6:*/ "[DEBUG] Using connector BasicRepositoryConnector with priority 0.0 for https://repo.maven.apache.org/maven2",
			/* 7:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-jar-plugin/3.2.0/maven-jar-plugin-3.2.0.jar",
			/* 8:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/apache/maven/plugins/maven-jar-plugin/3.2.0/maven-jar-plugin-3.2.0.jar (29 kB at 679 kB/s)",
			/* 9:*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/apache/maven/plugins/maven-jar-plugin/3.2.0/_remote.repositories",
			/*10:*/ "[DEBUG] Writing tracking file /home/chris/.m2/repository/org/apache/maven/plugins/maven-jar-plugin/3.2.0/maven-jar-plugin-3.2.0.jar.lastUpdated",
			/*11:*/ "[DEBUG] Lifecycle default -> [validate, initialize, generate-sources, process-sources, generate-resources, process-resources, compile, process-classes, generate-test-sources, process-test-sources, generate-test-resources, process-test-resources, test-compile, process-test-classes, test, prepare-package, package, pre-integration-test, integration-test, post-integration-test, verify, install, deploy]",
			/*12:*/ "[DEBUG] Lifecycle clean -> [pre-clean, clean, post-clean]",
			/*13:*/ "[DEBUG] Lifecycle site -> [pre-site, site, post-site, site-deploy]",
			/*14:*/ "[DEBUG] Lifecycle default -> [validate, initialize, generate-sources, process-sources, generate-resources, process-resources, compile, process-classes, generate-test-sources, process-test-sources, generate-test-resources, process-test-resources, test-compile, process-test-classes, test, prepare-package, package, pre-integration-test, integration-test, post-integration-test, verify, install, deploy]",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([7,10]); // 2nd-level downloading section
		expect(actual).to.be.containFoldingRange([9,10]); // debug lines to include in downloading section
		expect(actual).to.be.containFoldingRange([11,14]); // debug lines not included in downloading section
	});

	it('downloading with multiple second-level folding regions should fold the first second-level on line 2', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ",
			/* 1:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-actuator/2.4.3/spring-boot-starter-actuator-2.4.3.pom",
			/* 2:*/ "Progress (1): spring-boot-starter-actuator-2.4.3.pom (2.6 kB)",
			/* 3:*/ "                                                             ",
			/* 4:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-actuator/2.4.3/spring-boot-starter-actuator-2.4.3.pom (2.6 kB at 72 kB/s)",
			/* 5:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter/2.4.3/spring-boot-starter-2.4.3.pom",
			/* 6:*/ "Progress (1): spring-boot-starter-2.4.3.pom (3.1 kB)",
			/* 7:*/ "                                                    ",
			/* 8:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter/2.4.3/spring-boot-starter-2.4.3.pom (3.1 kB at 51 kB/s)",
			/* 9:*/ "[INFO] ",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.containFoldingRange([2,4]);
		expect(actual).to.notContainFoldingRange([1,4]);
	});

	it('downloading with only 1 second-level downloading does not include second level fold', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ",
			/* 1:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-actuator/2.4.3/spring-boot-starter-actuator-2.4.3.pom",
			/* 2:*/ "Progress (1): spring-boot-starter-actuator-2.4.3.pom (2.6 kB)",
			/* 3:*/ "                                                             ",
			/* 4:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-actuator/2.4.3/spring-boot-starter-actuator-2.4.3.pom (2.6 kB at 72 kB/s)",
			/* 5:*/ "[INFO] ",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([[1,4]]);
	});

	it('should not create folding sections of only 1 line', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] ",
			/* 1:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-actuator/2.4.3/spring-boot-starter-actuator-2.4.3.pom",
			/* 2:*/ "[INFO] ",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.notContainFoldingRange([1,1]);
	});
	
	it('should not duplicate downloading second-level regions', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] Scanning for projects...",
			/* 1:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-parent/2.7.5/spring-boot-starter-parent-2.7.5.pom",
			/* 2:*/ "Progress (1): 2.7/9.2 kB",
			/* 3:*/ "                    ",
			/* 4:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-starter-parent/2.7.5/spring-boot-starter-parent-2.7.5.pom (9.2 kB at 5.5 kB/s)",
			/* 5:*/ "Downloading from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-dependencies/2.7.5/spring-boot-dependencies-2.7.5.pom",
			/* 6:*/ "Progress (1): 2.7/108 kB",
			/* 7:*/ "Progress (1): 108 kB    ",
			/* 8:*/ "                    ",
			/* 9:*/ "Downloaded from central: https://repo.maven.apache.org/maven2/org/springframework/boot/spring-boot-dependencies/2.7.5/spring-boot-dependencies-2.7.5.pom (108 kB at 70 kB/s)",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([
			[1,9], // Top level downloading
			[2,4],[5,9] // Second level downloading
		]);
	});

	it('should not duplicate test output region', async () => {
		let document = await openDocument([
			/* 0:*/ "[INFO] Running com.example.multimodule.service.MyServiceTest",
			/* 1:*/ "16:33:46.196 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating CacheAwareContextLoaderDelegate from class [org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate]",
			/* 2:*/ "16:33:46.206 [main] DEBUG org.springframework.test.context.BootstrapUtils - Instantiating BootstrapContext using constructor [public org.springframework.test.context.support.DefaultBootstrapContext(java.lang.Class,org.springframework.test.context.CacheAwareContextLoaderDelegate)]",
			/* 3:*/ "[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.292 s - in com.example.multimodule.service.MyServiceTest",
		]);
		
		let actual = classUnderTestFoldingRanges(document);

		expect(actual).to.be.foldingRanges([
			[0,3], // Test region
			[1,2], // Test output - should only be included once
		]);
	});

});

function classUnderTestFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
	return new  foldingProvider.MavenLogFoldingRangeProvider().provideFoldingRanges(document, {}, new vscode.CancellationTokenSource().token) as vscode.FoldingRange[];
}

function logFoldingRanges(ranges: vscode.FoldingRange[]) {
	console.log(
		ranges
		.map(r => "[" + r.start + "," + r.end + "]")
		.join(",")
	);
}

async function openDocument(lines: string[]): Promise<vscode.TextDocument> {
	const document = await vscode.workspace.openTextDocument({
		language: 'log',
		content: lines.join("\n")
	});
	await vscode.window.showTextDocument(document)
	return document;
}
