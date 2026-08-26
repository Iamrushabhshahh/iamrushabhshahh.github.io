#!/usr/bin/env bash
# Verifies everything changed on 2026-08-26, against the LIVE site and repo.
# Nothing here reads local files, so it can't pass just because my working copy is right.
S=https://rushabhshah.dev
R=https://raw.githubusercontent.com/Iamrushabhshahh/linux-foundation-coupon/main
pass=0; fail=0
ck(){ # ck "label" "expected" "actual"
  if [ "$2" = "$3" ]; then printf "  \033[32m✓\033[0m %-52s %s\n" "$1" "$3"; pass=$((pass+1));
  else printf "  \033[31m✗\033[0m %-52s got=%s want=%s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi; }
code(){ curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
atleast(){ # atleast "label" min actual  — for counts that may legitimately grow
  if [ "$3" -ge "$2" ] 2>/dev/null; then printf "  \033[32m✓\033[0m %-52s %s (>=%s)\n" "$1" "$3" "$2"; pass=$((pass+1));
  else printf "  \033[31m✗\033[0m %-52s got=%s want>=%s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi; }
has(){ curl -s --max-time 20 "$1" | grep -c -- "$2" | tr -d ' '; }

echo; echo "1. NEW PAGES RESPOND"
for p in /coupons/ /finops-coupon/ /finops-coupon/practitioner/ /finops-coupon/engineer/ \
         /finops-coupon/focus-analyst/ /finops-coupon/ai-value/ /finops-coupon/technology-value/; do
  ck "$p" 200 "$(code $S$p)"
done
ck "/assets/og-finops-coupon.jpg" 200 "$(code $S/assets/og-finops-coupon.jpg)"

echo; echo "2. FLASH SALE IS SHOWING (should vanish by itself after Aug 29)"
atleast "sale codes on LF overview"      1 "$(has $S/linux-foundation-coupon/ AUG26F35)"
ck "sale banner on a cert page"     1 "$(has $S/linux-foundation-coupon/cka/ 'Sale live now')"
ck "sale card on homepage"          1 "$(has $S/ 'Sale live')"
ck "sale note on hub"               1 "$(has $S/coupons/ AUG26F35)"

echo; echo "3. FINOPS PRICES MATCH learn.finops.org"
for pair in "practitioner 500 400" "engineer 500 400" "focus-analyst 400 320" \
            "ai-value 500 400" "technology-value 500 400"; do
  set -- $pair
  n=$(curl -s --max-time 20 $S/finops-coupon/$1/ | tr '\n' ' ' | tr -s ' ' \
        | grep -c "drops from \$$2 to about \$$3" | tr -d ' ')
  [ "$n" -ge 1 ] && n=present
  ck "/$1: \$$2 -> ~\$$3" present "$n"
done

echo; echo "4. EMAIL CAPTURE IS DORMANT (0 until you add the Pageclip key)"
ck "no signup form on hub"          0 "$(has $S/coupons/ signup-form)"
ck "no signup form on LF overview"  0 "$(has $S/linux-foundation-coupon/ signup-form)"
ck "privacy page documents it"      1 "$(has $S/privacy/ 'sale-alerts')"

echo; echo "5. AFFILIATE CLICK TRACKING"
atleast "CTA events on CKA page"         2 "$(has $S/linux-foundation-coupon/cka/ 'data-goatcounter-click')"
atleast "CTA events on FinOps page"      2 "$(has $S/finops-coupon/practitioner/ 'data-goatcounter-click')"

echo; echo "6. DISCOVERY"
ck "hub in sitemap"                 1 "$(curl -s $S/sitemap.xml | grep -c '<loc>https://rushabhshah.dev/coupons/</loc>' | tr -d ' ')"
atleast "finops URLs in sitemap"         6 "$(curl -s $S/sitemap.xml | grep -c 'finops-coupon' | tr -d ' ')"
ck "hub in llms.txt"                1 "$(has $S/llms.txt 'coupons/')"
ck "hub linked from homepage"       1 "$(has $S/ 'compared side by side')"

echo; echo "7. THE WORDING FIX (topic -> checkout)"
ck "old wrong claim is gone"        0 "$(has $S/finops-coupon/ 'does not work on FinOps training')"
ck "precise version is live"        1 "$(has $S/finops-coupon/ 'learn.finops.org, and neither')"

echo; echo "8. COUPON REPO"
n=$(has $R/README.md AUG26F35); [ "$n" -ge 2 ] && n=present
ck "README has sale codes"          present "$n"
ck "banner image exists"            200 "$(code $R/assets/linux-foundation-aug26-flash-sale-35-40-percent-off.webp)"
ck "fake stamp script deleted"      404 "$(code $R/scripts/update-verified-date.mjs)"
ck "real verifier exists"           200 "$(code $R/scripts/verify-prices.mjs)"
ck "README explains the check"      1 "$(has $R/README.md 'only moves on a clean pass')"

echo; echo "-------------------------------------------------------"
printf "  %d passed, %d failed\n" "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
