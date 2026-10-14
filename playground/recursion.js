// Bug #3: infinite recursion. Give countdown() a stopping point.
function countdown(n) {
  console.log(n);
  return countdown(n - 1);
}

countdown(3);
