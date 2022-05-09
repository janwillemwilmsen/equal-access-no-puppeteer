/******************************************************************************
    Copyright:: 2022- IBM, Inc
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 *****************************************************************************/

import { RPTUtil } from "../../v2/checker/accessibility/util/legacy";
import { getDefinedStyles, getComputedStyle } from "../../v4/util/CSSUtil";
import { Rule, RuleResult, RuleFail, RuleContext, RulePass, RuleContextHierarchy, RulePotential } from "../api/IRule";
import { eRulePolicy, eToolkitLevel } from "../api/IRule";

export let element_tabbable_off_screen: Rule = {
    id: "element_tabbable_off_screen",
    context: "dom:*",
    dependencies: [],
    help: {
        "en-US": {
            "group": "element_tabbable_off_screen.html",
            "pass": "element_tabbable_off_screen.html",
            "fail_off": "element_tabbable_off_screen.html",
            "potential_off": "element_tabbable_off_screen.html"
        }
    },
    messages: {
        "en-US": {
            "group": "Tabbable element should be on the screen and meet minimum target size when it has keyboard focus",
            "pass": "Tabbable element is on the screen",
            "potential_zerosize": "Confirm that the tabbable element <{0}> meets minimum target size when it has keyboard focus",
            "potential_off": "Confirm that the tabbable element <{0}> is on the screen when it has keyboard focus"
        }
    },
    rulesets: [{
        id: ["IBM_Accessibility", "WCAG_2_1", "WCAG_2_0"],
        num: ["2.4.7"],
        level: eRulePolicy.VIOLATION,
        toolkitLevel: eToolkitLevel.LEVEL_ONE
    }],
    act: [],
    run: (context: RuleContext, options?: {}, contextHierarchies?: RuleContextHierarchy): RuleResult | RuleResult[] => {
        const ruleContext = context["dom"].node as HTMLElement;
        if (!RPTUtil.isTabbable(ruleContext))
            return null;
        
        const nodeName = ruleContext.nodeName.toLocaleLowerCase(); 
        const bounds = context["dom"].bounds;
        //in case the bounds not available
        if (!bounds) return null;
        
        // defined styles only give the styles that changed
        const defined_styles = getDefinedStyles(ruleContext);
        const onfocus_styles = getDefinedStyles(ruleContext, ":focus");
                
        if (bounds['height'] === 0 || bounds['width'] === 0 
            || (defined_styles['position']==='absolute' && defined_styles['clip'] && defined_styles['clip'].replaceAll(' ', '')==='rect(0px,0px,0px,0px)'
              && !onfocus_styles['clip']))
            return RulePotential("potential_zerosize", [nodeName]);

        if (bounds['top'] > 0 && bounds['left'] > 0)
            return RulePass("pass");
        
        const default_styles = getComputedStyle(ruleContext);
        
        let top = bounds['top'];
        let left = bounds['left'];     
        if (Object.keys(onfocus_styles).length === 0 ) {
            // no onfocus position change, but could be changed from js 
            return RulePotential("potential_off", [nodeName]);
        } else {   
            // with onfocus position change
            if (typeof onfocus_styles['top'] !== 'undefined') {
                if (onfocus_styles['position'] === 'absolute' || (typeof onfocus_styles['position'] === 'undefined' && default_styles['position'] === 'absolute')) {
                    top = onfocus_styles['top'].replace(/\D/g,'');
                } else { 
                    // the position is undefined and the parent's position is 'relative'
                    top = Number.MIN_VALUE;   
                }     
            } 
            if (typeof onfocus_styles['left'] !== 'undefined') {
                if (onfocus_styles['position'] === 'absolute' || (typeof onfocus_styles['position'] === 'undefined' && default_styles['position'] === 'absolute'))
                    left = onfocus_styles['left'].replace(/\D/g,'');
                else { 
                    // the position is undefined and the parent's position is 'relative'
                    left = Number.MIN_VALUE;   
                }     
            }    
        }
        
        if (top > 0 && left > 0)
            return RulePass("pass");
        else
            return RulePotential("potential_off", [nodeName]);
    }
}
