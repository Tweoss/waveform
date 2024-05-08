build:
    tsc index.ts --lib es2015.collection,es6,dom --downlevelIteration --target es6

serve:
    penguin serve -w index.html -w index.js --no-auto-watch .
