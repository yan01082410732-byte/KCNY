# Dependency security review

Scope: smallest compatible patches, Next remains major 15. No force audit fix.

Before: npm audit Critical 1, High 4 (counts are affected packages, not advisory count).
After: npm audit and pnpm audit Critical 0, High 0.

| Package / path | Before | Selected | Advisory / vulnerable range |
|---|---|---|---|
| next (direct) | 15.5.22 | 15.5.27 | GHSA-p293-qw3h-jr36 <15.5.24; GHSA-2xp9-vwfh-vxw4 <15.5.24; also fixes GHSA-4jqv-mc3x-m676 and GHSA-mcj8-r9mp-w47p <15.5.27 |
| next > postcss | 8.4.31 | 8.5.23 | GHSA-6g55-p6wh-862q <=8.5.11; GHSA-r28c-9q8g-f849 <=8.5.17; also GHSA-qx2v-qp2m-jg93 <8.5.10 and GHSA-fxqj-rqcc-2cmp <=8.5.22 |
| next > sharp | 0.34.5 | 0.35.5 | GHSA-f88m-g3jw-g9cj <0.35.0; GHSA-rgj7-g3m4-5g8c <0.35.4; GHSA-wq5f-xc86-pv6w <0.35.5 |
| next > postcss > nanoid | 3.3.16 | 3.3.18 | GHSA-2v37-7h3g-55p8 <3.3.18 |
| next > postcss > source-map-js | 1.2.1 | 1.2.2 | GHSA-68fv-2mgg-jv7q >=1.0.0 <1.2.2 |

Sharp is still an optional Next dependency, with its upstream native packages
updated together. Next 15.5.27 explicitly allows Sharp 0.35.4+ in its dependency
range. The version change is security-driven; Node >=20.9 is required by Sharp.
Next's exact PostCSS pin needs a scoped override. Both lockfiles retain the same
reviewed choices; npm and pnpm override declarations are provided for both tools.
Native installation scripts are not newly enabled.

Unresolved Critical/High advisories: none in the final scans.
These are dependency risk findings, not proof the deployed website was exploited.
