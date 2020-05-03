import { TestBed, async, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { DMNJS } from '../model/dmn/dmnJS';
import { DmnSearchService } from './dmnSearchService';
import { DmnModdleRule } from '../model/dmn/dmnModdleRule';
import { DmnColumn } from '../model/dmn/dmnColumn';
import { SearchRequest, ReplaceRequest } from '../model/searchRequest';

declare var DmnJS: {
    new(object: object, object2?: object): DMNJS;
};

describe('DmnModelService', async () => {

    let cut: DmnSearchService;

    beforeEach(async(() => {

        TestBed.configureTestingModule({
            providers: [
                DmnSearchService,
            ]
        });

        cut = TestBed.inject(DmnSearchService);
    }));

    describe('searchRulesByCurrentFilter', () => {

        let modeller: DMNJS;
        let rules: DmnModdleRule[];

        const inputColumn = {id: 'input1_', index: 0, label: 'testinput', type: 'INPUT'};
        const outputColumn = {id: 'output_1', index: 0, label: 'output_1', type: 'OUTPUT'};
        const annotationColumn = {id: 'description', index: null, label: 'Annotation', type: 'ANNOTATION'};
        const columns: DmnColumn[] = [
            inputColumn,
            outputColumn,
            annotationColumn,
        ];

        beforeEach(fakeAsync(() => {
            const dummyElement = document.createElement('div');
            modeller = new DmnJS({
                container: dummyElement,
            });
            new Promise(function(resolve, _) {
                modeller.importXML(searchDmn, __ => {
                    const newView = modeller.getViews().find(view => view.element.id === 'testSearch');
                    modeller._switchView(<any>newView);
                    resolve(null);
                });
            }).then(x => x);

            tick(1);

            rules = modeller._activeView.element.decisionTable.rule;
        }));

        it('should find a single row by given searchexpression', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, false, new SearchRequest('Eintrag2'));

            expect(result.length).toBe(1);
            expect(result[0].inputEntry[0].text).toBe('"Huch"');
        }));

        it('should find multiple rows with matches in different columns', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, false, new SearchRequest('Hallo'));

            expect(result.length).toBe(2);
            expect(result[0].inputEntry[0].text).toBe('"Hallo"');
            expect(result[1].inputEntry[0].text).toBe('"alternative"');
        }));

        it('should find a value only in a concrete given output column', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, false, new SearchRequest('Hallo', outputColumn.id));

            expect(result.length).toBe(1);
            expect(result[0].inputEntry[0].text).toBe('"alternative"');
        }));

        it('should find a given annotation value', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, false, new SearchRequest('Ne Annotation'));

            expect(result.length).toBe(1);
            expect(result[0].inputEntry[0].text).toBe('"Huch"');
        }));

        it('should search the annotation column when requested', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, false, new SearchRequest('n', annotationColumn.id));

            expect(result.length).toBe(1);
            expect(result[0].inputEntry[0].text).toBe('"Huch"');
        }));

        it('should negate the given search and find all rows not matching', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, true, new SearchRequest('n', annotationColumn.id));

            expect(result.length).toBe(2);
            expect(result[0].inputEntry[0].text).toBe('"Hallo"');
            expect(result[1].inputEntry[0].text).toBe('"alternative"');
        }));

        it('should give back all rows when searchvalue is empty', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, false, new SearchRequest(''));

            expect(result.length).toBe(3);
            expect(result[0].inputEntry[0].text).toBe('"Hallo"');
            expect(result[1].inputEntry[0].text).toBe('"Huch"');
            expect(result[2].inputEntry[0].text).toBe('"alternative"');
        }));

        it('should give back no rows when searchvalue is empty and negation is chosen', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, true, new SearchRequest(''));

            expect(result.length).toBe(0);
        }));

        it('should give back an empty array if rows are null', async(() => {

            const result = cut.searchRulesByCurrentFilter(null, columns, true, new SearchRequest('Hallo'));

            expect(result).toEqual([]);
        }));

        it('should search rows with a trimmed searchvalue case insensitive', async(() => {

            const result = cut.searchRulesByCurrentFilter(rules, columns, false, new SearchRequest('  huCh'));

            expect(result.length).toBe(1);
            expect(result[0].inputEntry[0].text).toBe('"Huch"');
        }));
    });

    describe('replaceByCurrentReplaceSettings', () => {

        let modeller: DMNJS;
        let rules: DmnModdleRule[];

        const inputColumn = {id: 'input1_', index: 0, label: 'testinput', type: 'INPUT'};
        const outputColumn = {id: 'output_1', index: 0, label: 'output_1', type: 'OUTPUT'};
        const annotationColumn = {id: 'description', index: null, label: 'Annotation', type: 'ANNOTATION'};
        const columns: DmnColumn[] = [
            inputColumn,
            outputColumn,
            annotationColumn,
        ];

        beforeEach(fakeAsync(() => {
            const dummyElement = document.createElement('div');
            modeller = new DmnJS({
                container: dummyElement,
            });
            new Promise(function(resolve, _) {
                modeller.importXML(searchDmn, __ => {
                    const newView = modeller.getViews().find(view => view.element.id === 'testSearch');
                    modeller._switchView(<any>newView);
                    resolve(null);
                });
            }).then(x => x);

            tick(1);

            rules = modeller._activeView.element.decisionTable.rule;
        }));

        it('should replace a whole entry with another word and count occurance', async(() => {

            const resultCount = cut.replaceByCurrentReplaceSettings(
                modeller.getActiveViewer().get('modeling'), rules[1], columns, new ReplaceRequest(null, null, '"Huch"', '"Was"'));

            expect(rules[1].inputEntry[0].text).toEqual('"Was"');
            expect(resultCount).toBe(1);
        }));

        it('should replace a partial word with another word and count occurance', async(() => {

            const resultCount = cut.replaceByCurrentReplaceSettings(
                modeller.getActiveViewer().get('modeling'), rules[1], columns, new ReplaceRequest(null, null, 'uch', 'Was'));

            expect(rules[1].inputEntry[0].text).toEqual('"HWas"');
            expect(resultCount).toBe(1);
        }));

        it('should replace all occurances and give back the number of changed dmn elements', async(() => {

            const resultCount = cut.replaceByCurrentReplaceSettings(
                modeller.getActiveViewer().get('modeling'), rules[1], columns, new ReplaceRequest(null, null, 'n', 'TREFFER'));

            expect(rules[1].inputEntry[0].text).toEqual('"Huch"');
            expect(rules[1].outputEntry[0].text).toEqual('"EiTREFFERtrag2"');
            expect(rules[1].description).toEqual('TREFFERe ATREFFERTREFFERotatioTREFFER');
            expect(resultCount).toBe(2);
        }));
    });
});


const searchDmn = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/DMN/20151101/dmn.xsd"
xmlns:biodi="http://bpmn.io/schema/dmn/biodi/1.0" id="Definitions_0f6ehwc"
name="DRD" namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="testSearch" name="Test">
    <extensionElements>
      <biodi:bounds x="200" y="200" width="180" height="80" />
    </extensionElements>
    <decisionTable id="decisionTable_1">
      <input id="input_1">
        <inputExpression id="inputExpression_1" typeRef="string">
          <text>testinput</text>
        </inputExpression>
      </input>
      <output id="output_1" label="testoutput" typeRef="string" />
      <rule id="DecisionRule_0nno7fd">
        <inputEntry id="UnaryTests_1klmg02">
          <text>"Hallo"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1kjl5co">
          <text>"Welt"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_0il5tkw">
        <description>Ne Annotation</description>
        <inputEntry id="UnaryTests_0cjxuax">
          <text>"Huch"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0k5zfoe">
          <text>"Eintrag2"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_1m455f8">
        <inputEntry id="UnaryTests_0piny64">
          <text>"alternative"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1wfhr8p">
          <text>"Hallo"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>
`;
