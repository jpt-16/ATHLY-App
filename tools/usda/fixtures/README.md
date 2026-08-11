# Fixtures

**These are hand-written, not captured.** The environment these scripts were
built in cannot reach `api.nal.usda.gov`, so every document here was written from
the FoodData Central API documentation rather than saved from a real response.

That distinction matters, so it is stated plainly:

- **The shapes are what the tests are for.** The two response formats FDC uses —
  a search hit that flattens the nutrient onto the row (`nutrientId` / `value`)
  and a detail document that nests it (`nutrient.id` / `amount`) — are the thing
  worth pinning, because handling only one of them yields a food with zero
  calories and no error.
- **The numbers are illustrative and must not be quoted.** They are round figures
  chosen to make the arithmetic checkable by eye. Nothing in the app reads them,
  and nothing should.

Once the ingest has run for real, replacing these with saved responses from
`api.nal.usda.gov` — and adjusting the parsers to whatever the live shape turns
out to be — is the first thing to do. Until then the tests prove the logic is
self-consistent, not that it matches USDA.
