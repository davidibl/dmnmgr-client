import { TestBed, async, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { DmnModelService } from './dmnModelService';
import { DmnModdleEventType } from '../model/dmn/dmnModdleEventType';
import { DmnType } from '../model/dmn/dmnType';
import { DmnModdleElement } from '../model/dmn/dmnModdleElement';
import { DmnModdleEvent } from '../model/dmn/dmnModdleEvent';
import { DataModelService } from './dataModelService';
import { DMNJS } from '../model/dmn/dmnJS';
import { of, empty } from 'rxjs';
import { JsonDatatype } from '../model/json/jsonDatatypes';
import { DmnDatatypeMapping } from '../model/dmn/dmnDatatypeMapping';

declare var DmnJS: {
    new(object: object, object2?: object): DMNJS;
};

describe('DmnModelService', async () => {

    let cut: DmnModelService;
    let dataModelService: jasmine.SpyObj<DataModelService>;

    beforeEach(async(() => {

        const dataModelServiceSpy = jasmine.createSpyObj('DataModelService',
            ['getPropertyByPath', 'getEnumValuesByPath', 'getDatatypeByPath']);

        TestBed.configureTestingModule({
            providers: [
                DmnModelService,
                { provide: DataModelService, useValue: dataModelServiceSpy },
            ]
        });

        cut = TestBed.inject(DmnModelService);
        dataModelService = <any>TestBed.inject(DataModelService);
    }));

    describe('initialize', () => {

        it('should try to create a config file on initialization', async(() => {

            expect(cut).not.toBeNull();
        }));
    });

    describe('Configuring Datatypes', () => {

        let modeller: DMNJS;

        beforeEach(fakeAsync(() => {
            const dummyElement = document.createElement('div');
            modeller = new DmnJS({
                container: dummyElement,
            });
            new Promise(function(resolve, _) {
                modeller.importXML(decisionTableTwoInputs, __ => {
                    const newView = modeller.getViews().find(view => view.element.id === 'Decision_13nychf');
                    modeller._switchView(<any>newView);
                    resolve(null);
                });
            }).then(x => x);

            tick(1);
        }));

        it('should configure the datatype for given input element', async(() => {

            dataModelService.getDatatypeByPath.and.returnValue(of(JsonDatatype.INTEGER));
            dataModelService.getEnumValuesByPath.and.returnValue(of([]));

            cut.updateInputColumns(modeller.getActiveViewer().get('modeling'),
                modeller?._activeView?.element?.decisionTable);

            expect(modeller._activeView.element.decisionTable.input[0].inputExpression.typeRef).toBe(DmnDatatypeMapping.integer);
        }));

        it('should return immidiatly when there is no input', async(() => {

            dataModelService.getDatatypeByPath.and.returnValue(of(JsonDatatype.INTEGER));
            dataModelService.getEnumValuesByPath.and.returnValue(of([]));

            modeller._activeView.element.decisionTable.input = null;

            cut.updateInputColumns(modeller.getActiveViewer().get('modeling'),
                modeller?._activeView?.element?.decisionTable);
        }));

        it('should set input restriction on inputs', async(() => {

            const restrictionValue1 = 'Hallo';
            const restrictionValue2 = 'Welt';
            const restrictionSet = [restrictionValue1, restrictionValue2];

            dataModelService.getDatatypeByPath.and.returnValue(of(null));
            dataModelService.getEnumValuesByPath.and.callFake(param => {
                if (param === 'Eigenschaft') {
                    return of(restrictionSet);
                }
                return empty();
            });

            cut.updateInputColumns(modeller.getActiveViewer().get('modeling'),
                modeller?._activeView?.element?.decisionTable);

            expect(modeller._activeView.element.decisionTable.input[0].inputValues.text)
                .toBe(`"${restrictionValue1}","${restrictionValue2}"`);

            expect(modeller._activeView.element.decisionTable.input[1].inputValues).toBeUndefined();
        }));

        it('should do nothing breaking when setting the same restriction values again', async(() => {

            const restrictionValue1 = 'Huhu';
            const restrictionSet = [restrictionValue1];

            dataModelService.getDatatypeByPath.and.returnValue(of(null));
            dataModelService.getEnumValuesByPath.and.callFake(param => {
                if (param === 'Eigenschaft2') {
                    return of(restrictionSet);
                }
                return empty();
            });

            cut.updateInputColumns(modeller.getActiveViewer().get('modeling'),
                modeller?._activeView?.element?.decisionTable);

            expect(modeller._activeView.element.decisionTable.input[2].inputValues.text)
                .toBe(`"${restrictionValue1}"`);
        }));

        it('should set datatypes and restriction sets on change event', async(() => {

            const restrictionValue1 = 'Huhu';
            const restrictionSet = [restrictionValue1];

            dataModelService.getDatatypeByPath.and.returnValue(of(JsonDatatype.STRING));
            dataModelService.getEnumValuesByPath.and.returnValue(of(restrictionSet));

            const changedInput = modeller._activeView.element.decisionTable.input[0];

            cut.setDataModelPropertiesOnColumns(modeller.getActiveViewer().get('modeling'),
                { element: null, elements: [changedInput, changedInput.inputExpression] });

            expect(modeller._activeView.element.decisionTable.input[0].inputValues.text)
                .toBe(`"${restrictionValue1}"`);
            expect(modeller._activeView.element.decisionTable.input[0].inputExpression.typeRef)
                .toBe(DmnDatatypeMapping.string);
        }));
    });

    describe('Import', () => {

        let modeller: DMNJS;

        beforeEach(fakeAsync(() => {
            const dummyElement = document.createElement('div');
            modeller = new DmnJS({
                container: dummyElement,
            });
            new Promise(function(resolve, _) {
                modeller.importXML(decisionTableTwoInputsStringInt, __ => {
                    const newView = modeller.getViews().find(view => view.element.id === 'Decision_13nychf');
                    modeller._switchView(<any>newView);
                    resolve(null);
                });
            }).then(x => x);

            tick(1);
        }));

        it('should be able to import csv data and append rows to existing model', fakeAsync(() => {

            const firstInputInt = '10';
            const lastInputString = '"Test5"';
            const testImportData = [
                ['"Test3"', firstInputInt, '"Huch"'],
                [lastInputString, '11', '"Super"']
            ];

            cut.importData(
                testImportData,
                modeller._moddle,
                modeller._activeView.element.decisionTable,
                false);

            tick(1);

            const table = modeller._activeView.element.decisionTable;
            expect(table.rule.length).toBe(4);
            expect(table.rule[2].inputEntry[1].text).toBe(firstInputInt);
            expect(table.rule[3].inputEntry[0].text).toBe(lastInputString);
        }));

        it('should be able to import csv data and append rows to existing model', fakeAsync(() => {

            const firstInputInt = '10';
            const lastInputString = '"Test5"';
            const testImportData = [
                ['"Test3"', firstInputInt, '"Huch"'],
                [lastInputString, '11', '"Super"']
            ];

            cut.importData(
                testImportData,
                modeller._moddle,
                modeller._activeView.element.decisionTable,
                true);

            tick(1);

            const table = modeller._activeView.element.decisionTable;
            expect(table.rule.length).toBe(testImportData.length);
            expect(table.rule[0].inputEntry[1].text).toBe(firstInputInt);
            expect(table.rule[1].inputEntry[0].text).toBe(lastInputString);
        }));

        it('should be able to add hyphens when string column is found', fakeAsync(() => {

            const firstInputInt = '10';
            const lastInputString = 'Test5';
            const testImportData = [
                ['"Test3"', firstInputInt, '"Huch"'],
                [lastInputString, '11', '"Super"']
            ];

            cut.importData(
                testImportData,
                modeller._moddle,
                modeller._activeView.element.decisionTable,
                true);

            tick(1);

            const table = modeller._activeView.element.decisionTable;
            expect(table.rule.length).toBe(testImportData.length);
            expect(table.rule[1].inputEntry[0].text).toBe(`"${lastInputString}"`);
        }));
    });

    describe('Functions', () => {
        it('should generate an uuid', async(() => {

            const uuid = cut.generateId(DmnType.DECISION_TABLE);
            expect(uuid).not.toBeNull();
            expect(uuid.indexOf('Decision') === 0).toBeTruthy();
        }));
    });

    describe('EscapeSequenceCheck', () => {

        it('should be able to check if a string starts with an escape char', async(() => {

            expect(cut.hasEscapeChar('"test"')).toBeTruthy();
            expect(cut.hasEscapeChar('test')).toBeFalsy();
        }));

        it('should map to EventType none if the event is null', async(() => {

            expect(cut.dmnModelChangeEventType(null)).toEqual(DmnModdleEventType.NONE);
        }));

        it('should map correct to EventType InputClause', async(() => {

            expect(cut.dmnModelChangeEventType(createInputExpressionChangeEvent(DmnType.LITERAL_EXPRESSION)))
                .toEqual(DmnModdleEventType.INPUT_CLAUSE);
        }));

        it('should map correct to EventType None when event is not known', async(() => {

            expect(cut.dmnModelChangeEventType(createInputExpressionChangeEvent(DmnType.DECISION_TABLE)))
                .toEqual(DmnModdleEventType.NONE);
        }));

        it('should map correct to EventType OutputExpression', async(() => {

            expect(cut.dmnModelChangeEventType(createDmnOutputClauseChangeEvent()))
                .toEqual(DmnModdleEventType.OUTPUT_EXPRESSION);
        }));

        it('should detect no InputClause change event when elements is null', async(() => {

            expect(cut.isInputClause({ element: null, elements: null})).toBeFalsy();
        }));

        it('should detect no InputClause change event when elements size is less than two', async(() => {

            expect(cut.isInputClause({ element: null, elements:
                [createDmnElementWithType(DmnType.LITERAL_EXPRESSION)]})).toBeFalsy();
        }));

        it('should detect no InputClause change event when elements size is less than two', async(() => {

            expect(cut.isInputClause(createInputExpressionChangeEvent(DmnType.DECISION_TABLE))).toBeFalsy();
        }));

        it('should detect no OutputClause change event when no parent present', async(() => {

            const changeEvent = Object.assign({}, createDmnOutputClauseChangeEvent());
            changeEvent.elements[0].$parent.outputEntry = null;
            expect(cut.isOutputEntry(changeEvent)).toBeFalsy();
        }));
    });

    function createDmnOutputClauseChangeEvent(): DmnModdleEvent {
        return {
            element: null,
            elements: [
                <DmnModdleElement>{
                    id: '1',
                    $parent: { outputEntry: [<DmnModdleElement>{ id: '1' }]
                }}
            ]
        };
    }

    function createInputExpressionChangeEvent(type: string): DmnModdleEvent {
        return { element: null, elements: [createDmnElementWithType(type), createDmnElementWithType(DmnType.INPUT_CLAUSE)] };
    }

    function createDmnElementWithType(type: string): DmnModdleElement {
        return <DmnModdleElement>{
            $type: type
        };
    }
});

const decisionTableTwoInputs = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/DMN/20151101/dmn.xsd"
    xmlns:biodi="http://bpmn.io/schema/dmn/biodi/1.0" id="Definitions_0m4iuwx" name="DRD" namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_13nychf" name="Decision 1">
    <extensionElements>
      <biodi:bounds x="200" y="200" width="180" height="80" />
    </extensionElements>
    <decisionTable id="decisionTable_1">
      <input id="input_1">
        <inputExpression id="inputExpression_1" typeRef="string">
          <text>Eigenschaft</text>
        </inputExpression>
      </input>
      <input id="InputClause_0oc5csz">
        <inputExpression id="LiteralExpression_01dwrpo" typeRef="string">
          <text>Alter</text>
        </inputExpression>
      </input>
      <input id="InputClause_0xa5csz">
        <inputExpression id="LiteralExpression_01dwrzw" typeRef="string">
          <text>Eigenschaft2</text>
        </inputExpression>
        <inputValues id="UnaryTests_0hfdxbb">
          <text>"Huhu"</text>
        </inputValues>
      </input>
      <output id="output_1" typeRef="string" />
    </decisionTable>
  </decision>
</definitions>
`;

const decisionTableTwoInputsStringInt =
`
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/DMN/20151101/dmn.xsd"
    xmlns:biodi="http://bpmn.io/schema/dmn/biodi/1.0" id="Definitions_1ebsg01" name="DRD" namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_13nychf" name="Decision 1">
    <extensionElements>
      <biodi:bounds x="200" y="200" width="180" height="80" />
    </extensionElements>
    <decisionTable id="decisionTable_1">
      <input id="input_1">
        <inputExpression id="inputExpression_1" typeRef="string">
          <text>Eigenschaft1</text>
        </inputExpression>
      </input>
      <input id="InputClause_0i0z40u">
        <inputExpression id="LiteralExpression_1ir8f2b" typeRef="integer">
          <text>Eigenschaft2</text>
        </inputExpression>
      </input>
      <output id="output_1" name="Result" typeRef="string" />
      <rule id="DecisionRule_0nuazgh">
        <inputEntry id="UnaryTests_12qzn8b">
          <text>"Test"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_1wzz9za">
          <text>1</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0saxhol">
          <text>"Hallo"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_0rd7wha">
        <inputEntry id="UnaryTests_020np2e">
          <text>"Test2"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_01cj6ew">
          <text>5</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_13j4van">
          <text>"Welt"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
</definitions>
`;
