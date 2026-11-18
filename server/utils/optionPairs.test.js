import test from "node:test";
import assert from "node:assert/strict";
import { generateSql } from "./sqlGenerator.js";
import { SubModule } from "../modules/submodules/subModule.model.js";

const RELATION = [
  { label: "Self", value: "SE" }, { label: "Spouse", value: "SP" },
  { label: "Dependent Children", value: "DC" }, { label: "Guardian", value: "GD" },
];
const base = { queryType: "SELECT", sqlTemplate: "", placeholders: [], updatableFields: [], whereFields: [], whereLogic: "AND" };

test("UPDATE SET: user picks the label, SQL gets the code", () => {
  const template = { ...base, queryType: "UPDATE", sqlTemplate: "UPDATE Member SET {{SET_CLAUSE}} WHERE {{WHERE_CLAUSE}};",
    updatableFields: [{ fieldName: "Relation", columnName: "relation_code", dataType: "JSON", options: RELATION.map((p) => p.label), optionPairs: RELATION }],
    whereFields: [{ fieldName: "Member ID", columnName: "member_id", dataType: "STRING" }] };
  const sql = generateSql(template, { selectedUpdateFields: ["Relation"], updateFieldValues: { Relation: "Dependent Children" },
    selectedWhereFields: ["Member ID"], whereFieldValues: { "Member ID": "M1" } });
  assert.equal(sql, "UPDATE Member SET relation_code = 'DC' WHERE member_id = 'M1';");
});

test("WHERE condition maps the label to its code", () => {
  const template = { ...base, sqlTemplate: "SELECT * FROM Member WHERE {{WHERE_CLAUSE}}",
    whereFields: [{ fieldName: "Relation", columnName: "relation_code", dataType: "JSON", optionPairs: RELATION }] };
  const sql = generateSql(template, { selectedWhereFields: ["Relation"], whereFieldValues: { Relation: "Guardian" } });
  assert.equal(sql, "SELECT * FROM Member WHERE relation_code = 'GD'");
});

test("JSON with no mapping keeps the old behaviour (free JSON text, quoted)", () => {
  const t = { ...base, sqlTemplate: "SELECT {{J}}", placeholders: [{ name: "J", label: "J", dataType: "JSON", required: true }] };
  assert.equal(generateSql(t, { placeholderValues: { J: '{"a": "it\'s"}' } }), "SELECT '{\"a\": \"it''s\"}'");
});

test("ARRAY ignores optionPairs: the plain option text is used as before", () => {
  const t = { ...base, sqlTemplate: "SELECT {{A}}", placeholders: [{ name: "A", label: "A", dataType: "ARRAY", required: true, options: ["Self"], optionPairs: RELATION }] };
  assert.equal(generateSql(t, { placeholderValues: { A: "Self" } }), "SELECT 'Self'");
});

test("placeholder and default value map too", () => {
  const ph = { name: "Rel", label: "Relation", dataType: "JSON", required: false, optionPairs: RELATION, defaultValue: "Spouse" };
  const t = { ...base, sqlTemplate: "SELECT {{Rel}}", placeholders: [ph] };
  assert.equal(generateSql(t, { placeholderValues: { Rel: "Self" } }), "SELECT 'SE'");
  assert.equal(generateSql(t, {}), "SELECT 'SP'");
});

test("a label that is not in the list is rejected with 400", () => {
  const t = { ...base, sqlTemplate: "SELECT {{Rel}}", placeholders: [{ name: "Rel", label: "Relation", dataType: "JSON", required: true, optionPairs: RELATION }] };
  assert.throws(() => generateSql(t, { placeholderValues: { Rel: "SE" } }), { statusCode: 400 });   // the code itself is not accepted
  assert.throws(() => generateSql(t, { placeholderValues: { Rel: "x'; DROP TABLE y;--" } }), { statusCode: 400 });
});

test("plain ARRAY options (no pairs) behave as before", () => {
  const t = { ...base, sqlTemplate: "SELECT {{S}}", placeholders: [{ name: "S", label: "Status", dataType: "JSON", required: true, options: ["Active"] }] };
  assert.equal(generateSql(t, { placeholderValues: { S: "Active" } }), "SELECT 'Active'");
});

// ---- model hook (no database needed: validate() only runs the schema)
const doc = (rows) => new SubModule({ name: "q", category: "64b000000000000000000001", module: "64b000000000000000000002",
  createdBy: "64b000000000000000000003", sqlTemplate: "x", placeholders: rows });

test("hook rebuilds options from the pair labels", async () => {
  const d = doc([{ name: "R", label: "R", dataType: "JSON", options: ["junk"], optionPairs: RELATION, defaultValue: "Self" }]);
  await d.validate();
  assert.deepEqual([...d.placeholders[0].options], ["Self", "Spouse", "Dependent Children", "Guardian"]);
});

test("hook rejects duplicate labels and unknown defaults", async () => {
  const dup = doc([{ name: "R", label: "R", dataType: "JSON", optionPairs: [{ label: "A", value: "1" }, { label: "A", value: "2" }] }]);
  await assert.rejects(() => dup.validate(), { statusCode: 400 });
  const bad = doc([{ name: "R", label: "R", dataType: "JSON", optionPairs: RELATION, defaultValue: "SE" }]);
  await assert.rejects(() => bad.validate(), { statusCode: 400 });
});

test("hook drops pairs when the type is not JSON", async () => {
  const d = doc([{ name: "R", label: "R", dataType: "ARRAY", options: ["x"], optionPairs: RELATION }]);
  await d.validate();
  assert.equal(d.placeholders[0].optionPairs.length, 0);
});
